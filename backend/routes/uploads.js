const express = require("express");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Expect env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME, CDN_BASE_URL
const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET_NAME;
const CDN_BASE_URL = process.env.CDN_BASE_URL || ""; // e.g., https://cdn.example.com

if (!REGION || !BUCKET) {
  console.warn(
    "S3 uploads not fully configured. Set AWS_REGION and S3_BUCKET_NAME (and credentials)."
  );
}

const s3 = new S3Client({ region: REGION });

// POST /api/uploads/photos/presign
// Body: { files: [{ fileName, contentType }], prefix? }
// Returns: [{ key, url, uploadUrl, contentType }]
router.post("/photos/presign", protect, async (req, res) => {
  try {
    const { files = [], prefix = "reviews" } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "files array required" });
    }

    const userId = req.user?._id?.toString() || "anon";
    const now = Date.now();

    const results = await Promise.all(
      files.map(async (f, idx) => {
        const safeName = (f.fileName || `photo_${idx}`).replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );
        const key = `${prefix}/${userId}/${now}_${safeName}`;
        const contentType = f.contentType || "image/jpeg";
        const command = new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ContentType: contentType,
          ACL: "public-read",
        });
        const uploadUrl = await getSignedUrl(s3, command, {
          expiresIn: 60 * 5,
        });
        const publicUrl = CDN_BASE_URL
          ? `${CDN_BASE_URL}/${key}`
          : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
        return { key, url: publicUrl, uploadUrl, contentType };
      })
    );

    res.json({ uploads: results });
  } catch (err) {
    console.error("presign error", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
