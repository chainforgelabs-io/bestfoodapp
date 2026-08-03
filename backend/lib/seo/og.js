/**
 * OG image (1200×630) generation wrapping existing sharp primitives.
 * Uploads to S3 and returns the public URL. Failures must not block publish.
 */

const sharp = require("sharp");
const {
  S3Client,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET_NAME;
const CDN_BASE_URL = process.env.CDN_BASE_URL || "";

function s3Enabled() {
  return Boolean(REGION && BUCKET && process.env.AWS_ACCESS_KEY_ID);
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Composite a simple 1200×630 OG card from an optional photo + text overlays.
 */
async function generateOgImage({
  photoUrl,
  title,
  subtitle,
  score,
}) {
  const width = 1200;
  const height = 630;
  const bg = { r: 149, g: 98, b: 212, alpha: 1 };

  let base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: bg,
    },
  });

  const layers = [];
  const photoBuf = await fetchImageBuffer(photoUrl);
  if (photoBuf) {
    const resized = await sharp(photoBuf)
      .rotate()
      .resize(width, height, { fit: "cover", position: "centre" })
      .toBuffer();
    layers.push({ input: resized, top: 0, left: 0 });
    // Darken overlay for text contrast
    const overlay = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.45 },
      },
    })
      .png()
      .toBuffer();
    layers.push({ input: overlay, top: 0, left: 0 });
  }

  const safeTitle = String(title || "Best Food App").slice(0, 60);
  const safeSub = String(subtitle || "").slice(0, 80);
  const scoreText = Number.isFinite(Number(score))
    ? String(Math.round(score))
    : "";

  const svg = `
    <svg width="${width}" height="${height}">
      <style>
        .t { fill: white; font-family: Arial, sans-serif; font-weight: 700; }
        .s { fill: #f3eefa; font-family: Arial, sans-serif; }
      </style>
      <text x="60" y="220" class="t" font-size="56">${escapeXml(safeTitle)}</text>
      <text x="60" y="290" class="s" font-size="32">${escapeXml(safeSub)}</text>
      ${
        scoreText
          ? `<circle cx="1080" cy="120" r="70" fill="white"/><text x="1080" y="138" text-anchor="middle" class="t" fill="#6b4a99" font-size="48">${scoreText}</text>`
          : ""
      }
      <text x="60" y="560" class="s" font-size="28">bestfoodapp.com</text>
    </svg>
  `;
  layers.push({ input: Buffer.from(svg), top: 0, left: 0 });

  if (layers.length) {
    base = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: bg,
      },
    }).composite(layers);
  }

  return base.jpeg({ quality: 85 }).toBuffer();
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function uploadOgBuffer(buffer, key) {
  if (!s3Enabled()) {
    throw new Error("s3_not_configured");
  }
  const client = new S3Client({ region: REGION });
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function generateAndUploadOg(review, restaurant, foodItem) {
  const title = foodItem?.name || restaurant?.name || "Review";
  const subtitle = restaurant?.name || "";
  const photoUrl = Array.isArray(review.photos) ? review.photos[0] : null;
  const buffer = await generateOgImage({
    photoUrl,
    title,
    subtitle,
    score: review.score,
  });
  const key = `og/${review._id}-${Date.now()}.jpg`;
  const url = await uploadOgBuffer(buffer, key);
  return url;
}

module.exports = {
  generateOgImage,
  generateAndUploadOg,
  s3Enabled,
};
