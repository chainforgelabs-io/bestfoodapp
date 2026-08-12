/**
 * Extract structured menu items from S3 images via xAI Grok vision.
 */
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const {
  taxonomyPromptBlock,
  coerceMenuItem,
} = require("./taxonomy");

const REGION = process.env.AWS_REGION;
const XAI_API_KEY = process.env.XAI_API_KEY;
// grok-2-vision-1212 was deprecated 2026-02-28; grok-4.5 is the current vision chat model.
const XAI_MODEL = process.env.XAI_MODEL || "grok-4.5";
const XAI_BASE = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const MAX_IMAGE_EDGE = Number(process.env.XAI_MENU_MAX_EDGE || 2048);
const JPEG_QUALITY = Number(process.env.XAI_MENU_JPEG_QUALITY || 85);

const s3 = REGION ? new S3Client({ region: REGION }) : null;

async function streamToBuffer(body) {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body?.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const LOADABLE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function normalizeLoadableMime(contentType) {
  const raw = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (raw === "image/jpg") return "image/jpeg";
  if (LOADABLE_MIME.has(raw)) return raw;
  return null;
}

function formatXaiError(data, status, bodyText) {
  const parts = [
    data?.error?.message,
    typeof data?.error === "string" ? data.error : null,
    data?.message,
    data?.error?.code ? `code=${data.error.code}` : null,
    data?.error?.type ? `type=${data.error.type}` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(" — ");
  if (bodyText && bodyText.length < 400) return bodyText;
  return `xAI request failed (${status})`;
}

/**
 * xAI image understanding accepts JPEG/PNG only (max 20MiB).
 * Re-encode everything to a bounded JPEG for reliable vision calls.
 */
async function toVisionJpegDataUrl(buf) {
  let pipeline = sharp(buf, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);
  if (longest > MAX_IMAGE_EDGE) {
    pipeline = pipeline.resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  const jpeg = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

async function loadImageAsDataUrl(image) {
  if (!s3) {
    throw new Error("AWS_REGION is not configured for menu image reads");
  }
  const out = await s3.send(
    new GetObjectCommand({
      Bucket: image.imageBucket,
      Key: image.key,
    })
  );
  const buf = await streamToBuffer(out.Body);
  const contentType = image.contentType || out.ContentType || "image/jpeg";
  const lower = String(contentType).toLowerCase();
  if (lower.includes("pdf") || image.key?.toLowerCase().endsWith(".pdf")) {
    const err = new Error(
      "PDF menus must be converted to images before scanning. Re-upload with the updated menu import page."
    );
    err.code = "UNSUPPORTED_MENU_FILE";
    throw err;
  }
  const mime = normalizeLoadableMime(contentType);
  if (!mime) {
    // Still try sharp decode (handles some mislabeled uploads)
    try {
      return await toVisionJpegDataUrl(buf);
    } catch {
      const err = new Error(
        `Unsupported menu file type "${contentType}". Use JPEG, PNG, WebP, HEIC, or PDF.`
      );
      err.code = "UNSUPPORTED_MENU_FILE";
      throw err;
    }
  }
  try {
    return await toVisionJpegDataUrl(buf);
  } catch (err) {
    const wrapped = new Error(
      `Could not prepare menu image for scanning: ${err.message || "decode failed"}`
    );
    wrapped.code = "UNSUPPORTED_MENU_FILE";
    throw wrapped;
  }
}

function buildPrompt(imageKeys) {
  return `You are extracting menu items from restaurant menu photo(s).

Return ONLY a JSON object with this shape:
{"items":[{"name":"string","category":"string","type":"string","subType":"string|null","price":number|null,"sizeOptions":""|"small"|"medium"|"large"|"extra large","tags":["string"],"sourceImageKey":"string"}]}

Rules:
- Extract every distinct food or drink item a customer can order.
- Ignore section headers, hours, addresses, disclaimers, and calorie-only lines.
- Map each item into ONE category and ONE type from this taxonomy only:
${taxonomyPromptBlock()}
- Prefer the closest listed type. Use type "Add +" only when nothing fits.
- category must be exactly one of the category names above.
- price: numeric dollars if shown (e.g. 14.99), else null. Ignore currency symbols.
- sizeOptions: only if the item clearly is a size variant; else "".
- tags: optional short tags like "spicy", "vegan", "gluten-free" when clearly indicated.
- sourceImageKey: which image the item came from. Available keys: ${JSON.stringify(imageKeys)}
- If the same item appears on multiple pages, include it once.
- Do not invent items that are not on the menu.`;
}

function parseAiJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty AI response");
  }
  let cleaned = text.trim();
  // Strip markdown fences if present
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Could not parse AI JSON");
  }
}

function extractTextFromResponsesApi(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  const chunks = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (
        (part?.type === "output_text" || part?.type === "text") &&
        typeof part.text === "string"
      ) {
        chunks.push(part.text);
      }
    }
  }
  if (chunks.length) return chunks.join("\n");
  // Chat-completions-shaped fallback
  const legacy = data?.choices?.[0]?.message?.content;
  if (typeof legacy === "string") return legacy;
  return null;
}

async function callGrokVision({ dataUrls, imageKeys }) {
  if (!XAI_API_KEY) {
    const err = new Error(
      "Menu scanning is not configured. Set XAI_API_KEY to enable Grok vision."
    );
    err.code = "XAI_NOT_CONFIGURED";
    throw err;
  }

  const prompt = buildPrompt(imageKeys);
  // Prefer Responses API (current xAI image-understanding path).
  const inputContent = [
    { type: "input_text", text: prompt },
    ...dataUrls.map((url) => ({
      type: "input_image",
      image_url: url,
      detail: "high",
    })),
  ];

  const res = await fetch(`${XAI_BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      // Avoid server-side history storage when sending images (xAI guidance).
      store: false,
      input: [{ role: "user", content: inputContent }],
    }),
  });

  const bodyText = await res.text();
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    const err = new Error(`xAI returned non-JSON (${res.status})`);
    err.code = "XAI_FAILED";
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    console.error("xAI menu scan error", {
      status: res.status,
      model: XAI_MODEL,
      imageCount: dataUrls.length,
      body: data,
    });
    const err = new Error(formatXaiError(data, res.status, bodyText));
    err.code = "XAI_FAILED";
    err.status = res.status;
    err.details = data;
    throw err;
  }

  const text = extractTextFromResponsesApi(data);
  if (!text) {
    const err = new Error("xAI returned no content");
    err.code = "XAI_FAILED";
    throw err;
  }

  return { text, raw: data };
}

/**
 * @param {Array<{key:string,imageBucket:string,contentType?:string}>} images
 * @returns {{ items: Array, rawAiJson: object }}
 */
async function extractMenuFromImages(images) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("No images to scan");
  }

  const imageKeys = images.map((img) => img.key);
  const dataUrls = [];
  for (const img of images) {
    dataUrls.push(await loadImageAsDataUrl(img));
  }

  const { text, raw } = await callGrokVision({ dataUrls, imageKeys });
  const parsed = parseAiJson(text);
  const list = Array.isArray(parsed?.items)
    ? parsed.items
    : Array.isArray(parsed)
      ? parsed
      : [];

  const items = [];
  const seen = new Set();
  for (const rawItem of list) {
    const coerced = coerceMenuItem(rawItem);
    if (!coerced) continue;
    const key = `${coerced.name.toLowerCase()}|${coerced.category}|${coerced.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(coerced);
  }

  return {
    items,
    rawAiJson: { response: raw, parsed },
  };
}

module.exports = {
  extractMenuFromImages,
  parseAiJson,
};
