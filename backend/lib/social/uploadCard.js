const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET_NAME;
const CDN_BASE_URL = process.env.CDN_BASE_URL || "";

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    if (!REGION) throw new Error("AWS_REGION is not configured");
    s3Client = new S3Client({ region: REGION });
  }
  return s3Client;
}

/**
 * Upload a rendered social card PNG to S3 (public-read).
 * @param {string} reviewId
 * @param {Buffer} pngBuffer
 * @returns {Promise<string>} public URL
 */
async function uploadCard(reviewId, pngBuffer) {
  if (!BUCKET) throw new Error("S3_BUCKET_NAME is not configured");

  // Version the key per render so regenerated cards get a fresh URL and are
  // never masked by a stale browser/CDN cache of the previous render.
  const key = `social-cards/${reviewId}-${Date.now()}.png`;
  const s3 = getS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: pngBuffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
      ACL: "public-read",
    })
  );

  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

module.exports = { uploadCard };
