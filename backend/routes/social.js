const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const SocialSettings = require("../models/SocialSettings");
const { protect, admin } = require("../middleware/authMiddleware");
const { renderCard } = require("../lib/social/renderCard");
const { uploadCard } = require("../lib/social/uploadCard");
const {
  validateCaptionTemplate,
  renderCaption,
  SUPPORTED_PLACEHOLDERS,
} = require("../lib/social/caption");
const {
  hasRealPhoto,
  pickSourcePhoto,
  isStaged,
  ensureSocialPost,
} = require("../lib/social/reviewHelpers");
const { getPublisher } = require("../lib/social/publishers");

const router = express.Router();

const SERVER_STARTED_AT = new Date().toISOString();
// Bump this list whenever the renderer/feature surface changes so a quick hit
// to /api/social/version confirms which code a given deploy is actually running.
const RENDERER_FEATURES = [
  "badge-overlay-score",
  "score-vector-paths",
  "exif-autorotate",
  "versioned-card-url",
  "manual-transform",
  "caption-no-denominator",
];

// Public (no auth) so deploy state can be verified from a browser instantly.
router.get("/version", (req, res) => {
  res.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    serverStartedAt: SERVER_STARTED_AT,
    rendererFeatures: RENDERER_FEATURES,
  });
});

router.use(protect, admin);

function sanitizeTransform(input) {
  if (!input || typeof input !== "object") return null;
  const num = (v, def) => (Number.isFinite(Number(v)) ? Number(v) : def);
  const rotation = ((Math.round(num(input.rotation, 0) / 90) * 90) % 360 + 360) % 360;
  return {
    rotation,
    scale: Math.min(Math.max(num(input.scale, 1), 1), 4),
    offsetX: Math.min(Math.max(num(input.offsetX, 0), -1), 1),
    offsetY: Math.min(Math.max(num(input.offsetY, 0), -1), 1),
  };
}

function serializeSocialPost(sp) {
  if (!sp) return null;
  return {
    status: sp.status || "none",
    caption: sp.caption ?? null,
    cardImageUrl: sp.cardImageUrl ?? null,
    cardGeneratedAt: sp.cardGeneratedAt ?? null,
    sourcePhotoUrl: sp.sourcePhotoUrl ?? null,
    sourceTransform: sp.sourceTransform
      ? {
          rotation: sp.sourceTransform.rotation ?? 0,
          scale: sp.sourceTransform.scale ?? 1,
          offsetX: sp.sourceTransform.offsetX ?? 0,
          offsetY: sp.sourceTransform.offsetY ?? 0,
        }
      : { rotation: 0, scale: 1, offsetX: 0, offsetY: 0 },
    targets: {
      instagram: sp.targets?.instagram || null,
      x: sp.targets?.x || null,
      facebook: sp.targets?.facebook || null,
    },
    approvedBy: sp.approvedBy ?? null,
    approvedAt: sp.approvedAt ?? null,
    updatedAt: sp.updatedAt ?? null,
  };
}

async function loadAdminReview(reviewId) {
  if (!mongoose.isValidObjectId(reviewId)) return null;
  return Review.findOne({ _id: reviewId, userRole: "admin" })
    .populate("foodItem", "name category type")
    .populate({
      path: "restaurantId",
      select: "name address",
      populate: { path: "address", select: "city province country street" },
    });
}

// GET /settings
router.get("/settings", async (req, res) => {
  try {
    const settings = await SocialSettings.getOrCreate();
    res.json({
      captionTemplate: settings.captionTemplate,
      stagingThreshold: settings.stagingThreshold,
      defaultPlatforms: settings.defaultPlatforms,
      supportedPlaceholders: SUPPORTED_PLACEHOLDERS,
      updatedAt: settings.updatedAt,
    });
  } catch (err) {
    console.error("social settings get", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /settings
router.put("/settings", async (req, res) => {
  try {
    const { captionTemplate, stagingThreshold, defaultPlatforms } = req.body || {};
    const settings = await SocialSettings.getOrCreate();

    if (captionTemplate !== undefined) {
      const validation = validateCaptionTemplate(captionTemplate);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      settings.captionTemplate = captionTemplate;
    }

    if (stagingThreshold !== undefined) {
      const t = Number(stagingThreshold);
      if (Number.isNaN(t) || t < 0 || t > 100) {
        return res.status(400).json({ message: "stagingThreshold must be 0–100" });
      }
      settings.stagingThreshold = t;
    }

    if (defaultPlatforms !== undefined) {
      if (!Array.isArray(defaultPlatforms)) {
        return res.status(400).json({ message: "defaultPlatforms must be an array" });
      }
      const allowed = ["instagram", "x", "facebook"];
      if (!defaultPlatforms.every((p) => allowed.includes(p))) {
        return res.status(400).json({ message: "Invalid platform in defaultPlatforms" });
      }
      settings.defaultPlatforms = defaultPlatforms;
    }

    settings.updatedAt = new Date();
    await settings.save();

    res.json({
      captionTemplate: settings.captionTemplate,
      stagingThreshold: settings.stagingThreshold,
      defaultPlatforms: settings.defaultPlatforms,
      supportedPlaceholders: SUPPORTED_PLACEHOLDERS,
      updatedAt: settings.updatedAt,
    });
  } catch (err) {
    console.error("social settings put", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /queue
router.get("/queue", async (req, res) => {
  try {
    const settings = await SocialSettings.getOrCreate();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 50);
    const query = { userRole: "admin" };
    const andClauses = [];

    if (req.query.hasPhoto === "true") {
      query["photos.0"] = { $exists: true };
    } else if (req.query.hasPhoto === "false") {
      andClauses.push({
        $or: [{ photos: { $exists: false } }, { photos: { $size: 0 } }],
      });
    }

    if (req.query.staged === "true") {
      query.score = { $gte: settings.stagingThreshold };
    } else if (req.query.staged === "false") {
      query.score = { $lt: settings.stagingThreshold };
    }

    if (req.query.status) {
      const statuses = String(req.query.status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length > 0) {
        query["socialPost.status"] = { $in: statuses };
      }
    }

    if (req.query.posted === "true") {
      andClauses.push({
        $or: [
          { "socialPost.status": "published" },
          { "socialPost.targets.instagram.postId": { $ne: null } },
          { "socialPost.targets.x.postId": { $ne: null } },
          { "socialPost.targets.facebook.postId": { $ne: null } },
        ],
      });
    } else if (req.query.posted === "false") {
      andClauses.push({
        $nor: [
          { "socialPost.status": "published" },
          { "socialPost.targets.instagram.postId": { $ne: null } },
          { "socialPost.targets.x.postId": { $ne: null } },
          { "socialPost.targets.facebook.postId": { $ne: null } },
        ],
      });
    }

    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    if (req.query.cursor) {
      const cursorDate = new Date(req.query.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        query.reviewDate = { $lt: cursorDate };
      }
    }

    const reviews = await Review.find(query)
      .sort({ reviewDate: -1, _id: -1 })
      .limit(limit + 1)
      .populate("foodItem", "name category type")
      .populate({
        path: "restaurantId",
        select: "name address",
        populate: { path: "address", select: "city" },
      })
      .lean();

    const hasMore = reviews.length > limit;
    const slice = hasMore ? reviews.slice(0, limit) : reviews;

    const items = slice.map((review) => ({
      reviewId: review._id,
      itemName: review.foodItem?.name || "Unknown item",
      restaurantName: review.restaurantId?.name || "Unknown restaurant",
      city: review.restaurantId?.address?.city || "",
      score: Math.round(review.score || 0),
      reviewDate: review.reviewDate,
      photos: review.photos || [],
      hasRealPhoto: hasRealPhoto(review),
      isStaged: isStaged(review, settings.stagingThreshold),
      socialPost: serializeSocialPost(review.socialPost),
    }));

    const nextCursor =
      hasMore && slice.length > 0
        ? slice[slice.length - 1].reviewDate
        : null;

    // Total matching the active filter (independent of cursor pagination) so the
    // UI can show e.g. "42 available to post" for the current filter combo.
    const countQuery = { ...query };
    delete countQuery.reviewDate; // ignore the pagination cursor
    const total = await Review.countDocuments(countQuery);

    res.json({
      items,
      nextCursor,
      total,
      stagingThreshold: settings.stagingThreshold,
    });
  } catch (err) {
    console.error("social queue", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /generate
router.post("/generate", async (req, res) => {
  try {
    const { reviewId, transform, sourcePhotoUrl: preferredPhoto } =
      req.body || {};
    if (!reviewId) {
      return res.status(400).json({ message: "reviewId is required" });
    }

    const review = await loadAdminReview(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Admin review not found" });
    }

    if (!hasRealPhoto(review)) {
      return res.status(422).json({ error: "no_eligible_photo" });
    }

    const sourcePhotoUrl = pickSourcePhoto(review, preferredPhoto);
    const sourceTransform = sanitizeTransform(transform);
    const pngBuffer = await renderCard({
      photoUrl: sourcePhotoUrl,
      score: review.score,
      transform: sourceTransform,
    });
    const cardImageUrl = await uploadCard(review._id.toString(), pngBuffer);

    const settings = await SocialSettings.getOrCreate();
    const sp = ensureSocialPost(review);

    if (sp.caption == null) {
      sp.caption = renderCaption(
        settings.captionTemplate,
        review,
        review.foodItem,
        review.restaurantId
      );
    }

    sp.status = "draft";
    sp.cardImageUrl = cardImageUrl;
    sp.cardGeneratedAt = new Date();
    sp.sourcePhotoUrl = sourcePhotoUrl;
    if (sourceTransform) sp.sourceTransform = sourceTransform;
    sp.updatedAt = new Date();

    review.markModified("socialPost");
    await review.save();

    res.json({ socialPost: serializeSocialPost(review.socialPost) });
  } catch (err) {
    console.error("social generate", err);
    if (err.code === "missing_social_asset") {
      return res.status(503).json({
        error: "missing_social_asset",
        message: err.message,
      });
    }
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// PATCH /:reviewId
router.patch("/:reviewId", async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { caption, regenerate, action } = req.body || {};

    const review = await loadAdminReview(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Admin review not found" });
    }

    const sp = ensureSocialPost(review);

    if (caption !== undefined) {
      sp.caption = caption;
      sp.updatedAt = new Date();
    }

    if (regenerate) {
      if (!hasRealPhoto(review)) {
        return res.status(422).json({ error: "no_eligible_photo" });
      }
      const sourcePhotoUrl = pickSourcePhoto(
        review,
        regenerate.sourcePhotoUrl
      );
      // Use the provided transform, else fall back to the last saved one.
      const sourceTransform =
        sanitizeTransform(regenerate.transform) ||
        sanitizeTransform(sp.sourceTransform);
      const pngBuffer = await renderCard({
        photoUrl: sourcePhotoUrl,
        score: review.score,
        transform: sourceTransform,
      });
      const cardImageUrl = await uploadCard(review._id.toString(), pngBuffer);
      sp.cardImageUrl = cardImageUrl;
      sp.cardGeneratedAt = new Date();
      sp.sourcePhotoUrl = sourcePhotoUrl;
      if (sourceTransform) sp.sourceTransform = sourceTransform;
      if (sp.status === "none") sp.status = "draft";
      sp.updatedAt = new Date();
      // Caption edits are preserved — do not overwrite sp.caption here.
    }

    if (action === "approve") {
      if (!sp.cardImageUrl) {
        return res.status(400).json({ message: "Generate a card before approving" });
      }
      sp.status = "approved";
      sp.approvedBy = req.user._id.toString();
      sp.approvedAt = new Date();
      sp.updatedAt = new Date();
    } else if (action === "skip") {
      sp.status = "skipped";
      sp.updatedAt = new Date();
    }

    review.markModified("socialPost");
    await review.save();

    res.json({ socialPost: serializeSocialPost(review.socialPost) });
  } catch (err) {
    console.error("social patch", err);
    if (err.code === "missing_social_asset") {
      return res.status(503).json({
        error: "missing_social_asset",
        message: err.message,
      });
    }
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// POST /publish
router.post("/publish", async (req, res) => {
  try {
    const { reviewId, platforms } = req.body || {};
    if (!reviewId) {
      return res.status(400).json({ message: "reviewId is required" });
    }
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ message: "platforms array is required" });
    }

    const review = await loadAdminReview(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Admin review not found" });
    }

    const sp = ensureSocialPost(review);
    if (!["approved", "failed"].includes(sp.status)) {
      return res.status(400).json({
        message: "Review must be approved or failed before publishing",
      });
    }
    if (!sp.cardImageUrl) {
      return res.status(400).json({ message: "No card image to publish" });
    }

    const allowed = ["instagram", "x", "facebook"];
    const requested = platforms.filter((p) => allowed.includes(p));
    if (requested.length === 0) {
      return res.status(400).json({ message: "No valid platforms requested" });
    }

    let anyFailed = false;
    let anySucceeded = false;

    for (const platform of requested) {
      const existing = sp.targets?.[platform];
      if (existing?.postId) {
        continue; // idempotent — already published on this platform
      }

      try {
        const publisher = getPublisher(platform);
        const result = await publisher.publish({
          imageUrl: sp.cardImageUrl,
          caption: sp.caption || "",
          linkInBody: platform === "x" ? false : undefined,
        });
        sp.targets[platform] = {
          postId: result.postId,
          permalink: result.permalink,
          publishedAt: new Date(),
          error: null,
        };
        anySucceeded = true;
      } catch (pubErr) {
        console.error(`social publish ${platform}`, pubErr);
        sp.targets[platform] = {
          postId: existing?.postId || null,
          permalink: existing?.permalink || null,
          publishedAt: existing?.publishedAt || null,
          error: pubErr.message || "Publish failed",
        };
        anyFailed = true;
      }
    }

    if (anyFailed && !anySucceeded) {
      sp.status = "failed";
    } else if (!anyFailed) {
      sp.status = "published";
    } else {
      sp.status = "failed";
    }
    sp.updatedAt = new Date();

    review.markModified("socialPost");
    await review.save();

    res.json({ socialPost: serializeSocialPost(review.socialPost) });
  } catch (err) {
    console.error("social publish", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;
