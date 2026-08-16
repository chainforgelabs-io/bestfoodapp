/**
 * Admin social routes: queue reviews, render/upload cards, publish to IG/FB/X.
 * Auth: protect + admin. Card pipeline lives under ../lib/social/.
 */
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
  isPosted,
  ensureSocialPost,
} = require("../lib/social/reviewHelpers");
const { getPublisher } = require("../lib/social/publishers");

const router = express.Router();

const QUEUE_SORT_FIELDS = new Set([
  "reviewDate",
  "score",
  "itemName",
  "restaurantName",
]);

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Food/city filters applied after joining food items and addresses. */
function parseQueueFoodFilters(req) {
  return {
    itemSearch: String(req.query.itemSearch || "").trim(),
    foodCategory: String(req.query.foodCategory || "").trim(),
    foodType: String(req.query.foodType || "").trim(),
    city: String(req.query.city || "").trim(),
  };
}

function buildPostLookupMatch({ itemSearch, foodCategory, foodType, city }) {
  const match = {};
  if (itemSearch) {
    match["foodItemDoc.name"] = {
      $regex: escapeRegex(itemSearch),
      $options: "i",
    };
  }
  if (foodCategory) {
    match["foodItemDoc.category"] = foodCategory;
  }
  if (foodType) {
    match["foodItemDoc.type"] = foodType;
  }
  if (city) {
    match["addressDoc.city"] = city;
  }
  return match;
}

function hasPostLookupFilters(postLookupMatch) {
  return postLookupMatch && Object.keys(postLookupMatch).length > 0;
}

/** Base review match for stats (admin reviews + optional photo/staged filters). */
function buildStatsMatch(req, settings) {
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

  if (andClauses.length > 0) {
    query.$and = andClauses;
  }

  return query;
}

function parseStatsFilters(req) {
  return {
    city: String(req.query.city || "").trim(),
    hasPhoto: req.query.hasPhoto || "",
    staged: req.query.staged || "",
  };
}

function reshapeStatsRows(rows, threshold) {
  const categoryMap = new Map();
  let totalReviews = 0;

  for (const row of rows) {
    const category = row._id?.category || "Uncategorized";
    const type = row._id?.type || "Unspecified";
    const distinctIds = (row.distinctFoodItems || []).filter(Boolean);
    const typeEntry = {
      type,
      reviewCount: row.reviewCount,
      distinctFoodItems: distinctIds.length,
      avgScore: Math.round(row.avgScore || 0),
      withPhoto: row.withPhoto,
      staged: row.staged,
    };

    totalReviews += row.reviewCount;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        reviewCount: 0,
        distinctFoodItems: new Set(),
        scoreSum: 0,
        withPhoto: 0,
        staged: 0,
        types: [],
      });
    }

    const cat = categoryMap.get(category);
    cat.reviewCount += typeEntry.reviewCount;
    distinctIds.forEach((id) => cat.distinctFoodItems.add(String(id)));
    cat.scoreSum += (row.avgScore || 0) * row.reviewCount;
    cat.withPhoto += typeEntry.withPhoto;
    cat.staged += typeEntry.staged;
    cat.types.push(typeEntry);
  }

  const categories = [...categoryMap.values()]
    .map((cat) => ({
      category: cat.category,
      reviewCount: cat.reviewCount,
      distinctFoodItems: cat.distinctFoodItems.size,
      avgScore: cat.reviewCount
        ? Math.round(cat.scoreSum / cat.reviewCount)
        : 0,
      withPhoto: cat.withPhoto,
      staged: cat.staged,
      types: cat.types.sort((a, b) => b.reviewCount - a.reviewCount),
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount);

  return { totalReviews, categories, threshold };
}

async function fetchSocialStats(req, settings) {
  const matchQuery = buildStatsMatch(req, settings);
  const { city } = parseStatsFilters(req);
  const threshold = settings.stagingThreshold;

  const pipeline = [{ $match: matchQuery }, ...buildLookupStages()];

  if (city) {
    pipeline.push({ $match: { "addressDoc.city": city } });
  }

  pipeline.push({
    $group: {
      _id: {
        category: { $ifNull: ["$foodItemDoc.category", "Uncategorized"] },
        type: { $ifNull: ["$foodItemDoc.type", "Unspecified"] },
      },
      reviewCount: { $sum: 1 },
      distinctFoodItems: { $addToSet: "$foodItem" },
      avgScore: { $avg: "$score" },
      withPhoto: {
        $sum: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$photos", []] } }, 0] },
            1,
            0,
          ],
        },
      },
      staged: {
        $sum: {
          $cond: [{ $gte: ["$score", threshold] }, 1, 0],
        },
      },
    },
  });

  pipeline.push({
    $sort: { "_id.category": 1, reviewCount: -1 },
  });

  const rows = await Review.aggregate(pipeline);
  return reshapeStatsRows(rows, threshold);
}

/** Build Mongo match query for GET /queue from query-string filters. */
function buildQueueMatch(req, settings) {
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

  return query;
}

function parseQueueListParams(req) {
  const sort = QUEUE_SORT_FIELDS.has(req.query.sort)
    ? req.query.sort
    : "reviewDate";
  const order = req.query.order === "asc" ? "asc" : "desc";
  const uniqueBy = req.query.uniqueBy === "foodItem" ? "foodItem" : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 50);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  return { sort, order, uniqueBy, limit, page };
}

function usesSkipPagination(sort, uniqueBy) {
  return uniqueBy === "foodItem" || sort !== "reviewDate";
}

function sortDirection(order) {
  return order === "asc" ? 1 : -1;
}

function mapReviewToQueueItem(review, settings) {
  const foodItem =
    review.foodItem && typeof review.foodItem === "object"
      ? review.foodItem
      : null;
  const restaurant =
    review.restaurantId && typeof review.restaurantId === "object"
      ? review.restaurantId
      : null;

  return {
    reviewId: review._id,
    foodItemId: foodItem?._id || review.foodItem,
    itemName: foodItem?.name || "Unknown item",
    category: foodItem?.category || "",
    type: foodItem?.type || "",
    subType: foodItem?.subType || "",
    restaurantName: restaurant?.name || "Unknown restaurant",
    street: restaurant?.address?.street || "",
    city: restaurant?.address?.city || "",
    province: restaurant?.address?.province || "",
    country: restaurant?.address?.country || "",
    score: Math.round(review.score || 0),
    reviewDate: review.reviewDate,
    purchaseDate: review.purchaseDate || null,
    photos: review.photos || [],
    hasRealPhoto: hasRealPhoto(review),
    isStaged: isStaged(review, settings.stagingThreshold),
    comment: review.comment || "",
    tags: review.tags || [],
    price: foodItem?.price ?? null,
    socialPost: serializeSocialPost(review.socialPost),
  };
}

function buildLookupStages() {
  return [
    {
      $lookup: {
        from: "fooditems",
        localField: "foodItem",
        foreignField: "_id",
        as: "foodItemDoc",
      },
    },
    { $unwind: { path: "$foodItemDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurantId",
        foreignField: "_id",
        as: "restaurantDoc",
      },
    },
    { $unwind: { path: "$restaurantDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "addresses",
        localField: "restaurantDoc.address",
        foreignField: "_id",
        as: "addressDoc",
      },
    },
    { $unwind: { path: "$addressDoc", preserveNullAndEmptyArrays: true } },
  ];
}

function buildAggSortStage(sort, order) {
  const dir = sortDirection(order);
  switch (sort) {
    case "score":
      return { score: dir, reviewDate: -1, _id: -1 };
    case "itemName":
      return { "foodItemDoc.name": dir, reviewDate: -1, _id: -1 };
    case "restaurantName":
      return { "restaurantDoc.name": dir, reviewDate: -1, _id: -1 };
    default:
      return { reviewDate: dir, _id: dir };
  }
}

function shapeAggReview(doc) {
  return {
    _id: doc._id,
    score: doc.score,
    reviewDate: doc.reviewDate,
    purchaseDate: doc.purchaseDate,
    photos: doc.photos,
    comment: doc.comment,
    tags: doc.tags,
    socialPost: doc.socialPost,
    foodItem: doc.foodItemDoc
      ? {
          _id: doc.foodItemDoc._id,
          name: doc.foodItemDoc.name,
          category: doc.foodItemDoc.category,
          type: doc.foodItemDoc.type,
          subType: doc.foodItemDoc.subType,
          price: doc.foodItemDoc.price,
        }
      : doc.foodItem,
    restaurantId: doc.restaurantDoc
      ? {
          _id: doc.restaurantDoc._id,
          name: doc.restaurantDoc.name,
          address: doc.addressDoc
            ? {
                street: doc.addressDoc.street,
                city: doc.addressDoc.city,
                province: doc.addressDoc.province,
                country: doc.addressDoc.country,
              }
            : undefined,
        }
      : doc.restaurantId,
  };
}

async function fetchQueueViaAggregation({
  matchQuery,
  postLookupMatch,
  sort,
  order,
  uniqueBy,
  limit,
  page,
}) {
  const skip = (page - 1) * limit;
  const pipeline = [{ $match: matchQuery }];

  pipeline.push(...buildLookupStages());

  if (hasPostLookupFilters(postLookupMatch)) {
    pipeline.push({ $match: postLookupMatch });
  }

  if (uniqueBy === "foodItem") {
    pipeline.push(
      { $sort: { score: -1, reviewDate: -1, _id: -1 } },
      { $group: { _id: "$foodItem", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } }
    );
  }

  pipeline.push({ $sort: buildAggSortStage(sort, order) });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit + 1 });

  const docs = await Review.aggregate(pipeline);
  const hasMore = docs.length > limit;
  const slice = hasMore ? docs.slice(0, limit) : docs;
  return {
    reviews: slice.map(shapeAggReview),
    hasMore,
    page,
    nextCursor: null,
  };
}

async function countQueueTotal(matchQuery, uniqueBy, postLookupMatch) {
  if (uniqueBy === "foodItem" || hasPostLookupFilters(postLookupMatch)) {
    const pipeline = [{ $match: matchQuery }];
    pipeline.push(...buildLookupStages());
    if (hasPostLookupFilters(postLookupMatch)) {
      pipeline.push({ $match: postLookupMatch });
    }
    if (uniqueBy === "foodItem") {
      pipeline.push({ $group: { _id: "$foodItem" } });
    }
    pipeline.push({ $count: "total" });
    const result = await Review.aggregate(pipeline);
    return result[0]?.total || 0;
  }
  return Review.countDocuments(matchQuery);
}

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

// GET /stats — admin review counts grouped by food category and type
router.get("/stats", async (req, res) => {
  try {
    const settings = await SocialSettings.getOrCreate();
    const stats = await fetchSocialStats(req, settings);
    res.json({
      ...stats,
      stagingThreshold: settings.stagingThreshold,
    });
  } catch (err) {
    console.error("social stats", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /queue/filters — distinct cities in the admin review queue
router.get("/queue/filters", async (req, res) => {
  try {
    const result = await Review.aggregate([
      { $match: { userRole: "admin" } },
      ...buildLookupStages(),
      {
        $group: {
          _id: null,
          cities: { $addToSet: "$addressDoc.city" },
        },
      },
    ]);
    const cities = (result[0]?.cities || [])
      .filter((c) => c && String(c).trim())
      .sort((a, b) => a.localeCompare(b));
    res.json({ cities });
  } catch (err) {
    console.error("social queue filters", err);
    res.status(500).json({ message: "Server error" });
  }
});

const EXPORT_MAX = 5000;
const EXPORT_COLUMNS = [
  "reviewId",
  "itemName",
  "category",
  "type",
  "subType",
  "restaurantName",
  "street",
  "city",
  "province",
  "country",
  "score",
  "reviewDate",
  "purchaseDate",
  "hasPhoto",
  "photoCount",
  "staged",
  "socialStatus",
  "posted",
  "comment",
  "tags",
  "price",
];

function csvCell(value) {
  if (value == null || value === "") return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isoDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function reviewToExportRow(review, settings) {
  const item = mapReviewToQueueItem(review, settings);
  return {
    reviewId: String(item.reviewId),
    itemName: item.itemName,
    category: item.category,
    type: item.type,
    subType: item.subType,
    restaurantName: item.restaurantName,
    street: item.street,
    city: item.city,
    province: item.province,
    country: item.country,
    score: item.score,
    reviewDate: isoDate(item.reviewDate),
    purchaseDate: isoDate(item.purchaseDate),
    hasPhoto: item.hasRealPhoto ? "yes" : "no",
    photoCount: (item.photos || []).length,
    staged: item.isStaged ? "yes" : "no",
    socialStatus: item.socialPost?.status || "none",
    posted: isPosted(review.socialPost) ? "yes" : "no",
    comment: item.comment || "",
    tags: Array.isArray(item.tags) ? item.tags.join("; ") : "",
    price: item.price != null && item.price !== "" ? item.price : "",
  };
}

function toCsv(rows) {
  const header = EXPORT_COLUMNS.join(",");
  const body = rows.map((row) =>
    EXPORT_COLUMNS.map((col) => csvCell(row[col])).join(",")
  );
  return `\uFEFF${[header, ...body].join("\n")}`;
}

async function fetchAllFilteredReviews({
  matchQuery,
  postLookupMatch,
  sort,
  order,
  uniqueBy,
  limit,
}) {
  const pipeline = [{ $match: matchQuery }];
  pipeline.push(...buildLookupStages());
  if (hasPostLookupFilters(postLookupMatch)) {
    pipeline.push({ $match: postLookupMatch });
  }
  if (uniqueBy === "foodItem") {
    pipeline.push(
      { $sort: { score: -1, reviewDate: -1, _id: -1 } },
      { $group: { _id: "$foodItem", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } }
    );
  }
  pipeline.push({ $sort: buildAggSortStage(sort, order) });
  pipeline.push({ $limit: limit });
  const docs = await Review.aggregate(pipeline);
  return docs.map(shapeAggReview);
}

// GET /queue/export — CSV of all reviews matching current queue filters
router.get("/queue/export", async (req, res) => {
  try {
    const settings = await SocialSettings.getOrCreate();
    const { sort, order, uniqueBy } = parseQueueListParams(req);
    const matchQuery = buildQueueMatch(req, settings);
    const foodFilters = parseQueueFoodFilters(req);
    const postLookupMatch = buildPostLookupMatch(foodFilters);
    const reviews = await fetchAllFilteredReviews({
      matchQuery,
      postLookupMatch,
      sort,
      order,
      uniqueBy,
      limit: EXPORT_MAX,
    });
    const csv = toCsv(reviews.map((review) => reviewToExportRow(review, settings)));
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="social-reviews-${stamp}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error("social queue export", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /queue
router.get("/queue", async (req, res) => {
  try {
    const settings = await SocialSettings.getOrCreate();
    const { sort, order, uniqueBy, limit, page } = parseQueueListParams(req);
    const matchQuery = buildQueueMatch(req, settings);
    const foodFilters = parseQueueFoodFilters(req);
    const postLookupMatch = buildPostLookupMatch(foodFilters);
    const skipMode = usesSkipPagination(sort, uniqueBy);
    const useAggregation =
      skipMode ||
      uniqueBy === "foodItem" ||
      sort === "itemName" ||
      sort === "restaurantName" ||
      hasPostLookupFilters(postLookupMatch);

    let reviews;
    let hasMore = false;
    let nextCursor = null;
    let currentPage = page;

    if (useAggregation) {
      const result = await fetchQueueViaAggregation({
        matchQuery,
        postLookupMatch,
        sort,
        order,
        uniqueBy,
        limit,
        page,
      });
      reviews = result.reviews;
      hasMore = result.hasMore;
      currentPage = result.page;
    } else {
      const query = { ...matchQuery };
      if (req.query.cursor) {
        const cursorDate = new Date(req.query.cursor);
        if (!Number.isNaN(cursorDate.getTime())) {
          query.reviewDate =
            order === "asc"
              ? { $gt: cursorDate }
              : { $lt: cursorDate };
        }
      }

      const dir = sortDirection(order);
      const found = await Review.find(query)
        .sort({ reviewDate: dir, _id: dir })
        .limit(limit + 1)
        .populate("foodItem", "name category type subType price")
        .populate({
          path: "restaurantId",
          select: "name address",
          populate: { path: "address", select: "city province country street" },
        })
        .lean();

      hasMore = found.length > limit;
      reviews = hasMore ? found.slice(0, limit) : found;
      nextCursor =
        hasMore && reviews.length > 0
          ? reviews[reviews.length - 1].reviewDate
          : null;
      currentPage = 1;
    }

    const items = reviews.map((review) =>
      mapReviewToQueueItem(review, settings)
    );

    const total = await countQueueTotal(matchQuery, uniqueBy, postLookupMatch);

    res.json({
      items,
      nextCursor,
      hasMore: useAggregation ? hasMore : !!nextCursor,
      page: currentPage,
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
