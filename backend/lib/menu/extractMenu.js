/**
 * Extract structured menu items from S3 images via xAI Grok vision.
 */
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const {
  taxonomyPromptBlock,
  coerceMenuItem,
} = require("./taxonomy");

const REGION = process.env.AWS_REGION;
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || "grok-2-vision-1212";
const XAI_BASE = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

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

const VISION_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function normalizeVisionMime(contentType) {
  const raw = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (raw === "image/jpg") return "image/jpeg";
  if (VISION_MIME.has(raw)) return raw;
  return null;
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
  const mime = normalizeVisionMime(contentType);
  if (!mime) {
    const err = new Error(
      `Unsupported menu file type "${contentType}". Use JPEG, PNG, WebP, HEIC, or PDF.`
    );
    err.code = "UNSUPPORTED_MENU_FILE";
    throw err;
  }
  return `data:${mime};base64,${buf.toString("base64")}`;
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

async function callGrokVision({ dataUrls, imageKeys }) {
  if (!XAI_API_KEY) {
    const err = new Error(
      "Menu scanning is not configured. Set XAI_API_KEY to enable Grok vision."
    );
    err.code = "XAI_NOT_CONFIGURED";
    throw err;
  }

  const content = [
    { type: "text", text: buildPrompt(imageKeys) },
    ...dataUrls.map((url) => ({
      type: "image_url",
      image_url: { url, detail: "high" },
    })),
  ];

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.1,
      messages: [{ role: "user", content }],
    }),
  });

  const bodyText = await res.text();
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    const err = new Error(`xAI returned non-JSON (${res.status})`);
    err.code = "XAI_FAILED";
    throw err;
  }

  if (!res.ok) {
    const msg =
      data?.error?.message || data?.message || `xAI request failed (${res.status})`;
    const err = new Error(msg);
    err.code = "XAI_FAILED";
    err.status = res.status;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
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
