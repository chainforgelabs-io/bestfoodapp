/**
 * Receipt upload helpers: signed S3 URLs and Textract AnalyzeExpense autofill.
 * OCR is skipped gracefully when AWS credentials / region are missing.
 */
const express = require("express");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  TextractClient,
  AnalyzeExpenseCommand,
} = require("@aws-sdk/client-textract");
const Receipt = require("../models/Receipt");
const { parseAnalyzeExpense } = require("../utils/receiptParser");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();
const REGION = process.env.AWS_REGION;
const s3 = new S3Client({ region: REGION });
// Textract reads receipt images straight from S3. Lazily created so the
// rest of the receipt routes keep working even if OCR isn't configured.
const textract = REGION ? new TextractClient({ region: REGION }) : null;
const SIGNED_URL_EXPIRES = 300; // 5 min

const canViewReceipt = (receipt, user) => {
  if (!receipt || !user) return false;
  if (receipt.userId.toString() === user._id.toString()) return true;
  if (user.role === "admin") return true;
  return false;
};

// GET /api/receipts/admin/all — list all (admin, paginated) — before /:id
router.get("/admin/all", protect, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Receipt.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Receipt.countDocuments(),
    ]);

    res.json({
      items,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    console.error("admin receipts list", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/receipts
router.post("/", protect, async (req, res) => {
  try {
    const { imageKey, imageBucket, imageHash } = req.body;
    if (!imageKey || !imageBucket) {
      return res
        .status(400)
        .json({ message: "imageKey and imageBucket are required" });
    }

    const receipt = new Receipt({
      userId: req.user._id,
      imageKey: String(imageKey).trim(),
      imageBucket: String(imageBucket).trim(),
      imageHash: imageHash ? String(imageHash) : undefined,
      status: "pending",
    });
    await receipt.save();
    res.status(201).json(receipt);
  } catch (err) {
    console.error("receipt create", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/receipts/:id/analyze — run OCR (Textract AnalyzeExpense) on the
// stored image and persist the structured result for autofilling a review.
router.post("/:id/analyze", protect, async (req, res) => {
  try {
    if (!textract) {
      return res.status(503).json({
        message:
          "Receipt scanning is not configured. Set AWS_REGION and credentials to enable OCR.",
        code: "OCR_NOT_CONFIGURED",
      });
    }

    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    if (receipt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // If we've already analyzed this receipt, return the cached result.
    if (!req.query.force && receipt.parsedJson) {
      return res.json({ parsed: receipt.parsedJson, cached: true });
    }

    let awsResponse;
    try {
      awsResponse = await textract.send(
        new AnalyzeExpenseCommand({
          Document: {
            S3Object: { Bucket: receipt.imageBucket, Name: receipt.imageKey },
          },
        })
      );
    } catch (ocrErr) {
      console.error("Textract analyze error", ocrErr);
      return res.status(502).json({
        message: "Could not read the receipt image. You can enter details manually.",
        code: "OCR_FAILED",
      });
    }

    const parsed = parseAnalyzeExpense(awsResponse);

    receipt.rawOcrJson = awsResponse;
    receipt.parsedJson = parsed;
    if (parsed.total != null) receipt.totalAmount = parsed.total;
    if (parsed.subtotal != null) receipt.subtotal = parsed.subtotal;
    if (parsed.tax != null) receipt.tax = parsed.tax;
    if (parsed.tip != null) receipt.tip = parsed.tip;
    if (parsed.currency) receipt.currency = parsed.currency;
    if (parsed.purchaseDate) receipt.purchaseDate = parsed.purchaseDate;
    await receipt.save();

    res.json({ parsed, cached: false });
  } catch (err) {
    console.error("receipt analyze", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/receipts (current user's list)
router.get("/", protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user._id,
      $or: [{ archivedAt: { $exists: false } }, { archivedAt: null }],
    };
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) {
        filter.createdAt.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        const end = new Date(req.query.to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [items, total] = await Promise.all([
      Receipt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Receipt.countDocuments(filter),
    ]);

    res.json({
      items,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    console.error("receipts list", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/receipts/:id/image — signed read URL
router.get("/:id/image", protect, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    if (!canViewReceipt(receipt, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const command = new GetObjectCommand({
      Bucket: receipt.imageBucket,
      Key: receipt.imageKey,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: SIGNED_URL_EXPIRES });
    res.json({ url, expiresIn: SIGNED_URL_EXPIRES });
  } catch (err) {
    console.error("receipt image url", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/receipts/:id
router.patch("/:id", protect, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    if (receipt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { restaurantId, purchaseDate, totalAmount, subtotal, tax, tip, status, currency } =
      req.body;
    if (restaurantId !== undefined) receipt.restaurantId = restaurantId;
    if (purchaseDate !== undefined) receipt.purchaseDate = purchaseDate;
    if (totalAmount !== undefined) receipt.totalAmount = totalAmount;
    if (subtotal !== undefined) receipt.subtotal = subtotal;
    if (tax !== undefined) receipt.tax = tax;
    if (tip !== undefined) receipt.tip = tip;
    if (status !== undefined) {
      if (["pending", "confirmed", "discarded"].includes(status)) {
        receipt.status = status;
      }
    }
    if (currency !== undefined) receipt.currency = currency;

    await receipt.save();
    res.json(receipt);
  } catch (err) {
    console.error("receipt patch", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/receipts/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id).lean();
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    if (!canViewReceipt(receipt, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(receipt);
  } catch (err) {
    console.error("receipt get", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
