/**
 * Admin places batch review + public/auth autocomplete for review form.
 */

const express = require("express");
const Place = require("../models/Place");
const PlaceBatch = require("../models/PlaceBatch");
const PlaceCorrection = require("../models/PlaceCorrection");
const PlaceReviewQueue = require("../models/PlaceReviewQueue");
const PlacesSettings = require("../models/PlacesSettings");
const { protect, admin } = require("../middleware/authMiddleware");
const {
  searchPlacesAndRestaurants,
  reconcilePlaces,
  promotePlace,
  buildStagePreview,
} = require("../lib/places");
const { isAllowedCuisine } = require("../lib/menu/foodTaxonomyStore");

const router = express.Router();

// Autocomplete for review submission (authenticated)
router.get("/search", protect, async (req, res) => {
  try {
    const results = await searchPlacesAndRestaurants({
      q: req.query.q,
      cityId: req.query.cityId,
      city: req.query.city,
      province: req.query.province,
      country: req.query.country,
      limit: Math.min(parseInt(req.query.limit || "20", 10), 50),
      includeLowConfidence: req.query.includeLowConfidence === "true",
    });
    res.json({ results });
  } catch (err) {
    console.error("places search", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/promote/:placeId", protect, async (req, res) => {
  try {
    const result = await promotePlace(req.params.placeId, {
      userId: req.user._id,
      cuisine: req.body.cuisine,
      type: req.body.type,
    });
    res.json(result);
  } catch (err) {
    console.error("places promote", err);
    res.status(400).json({ message: err.message || "Promote failed" });
  }
});

// --- Admin batch UI ---

router.get("/batches", protect, admin, async (req, res) => {
  try {
    const batches = await PlaceBatch.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const settings = await PlacesSettings.getOrCreate();
    res.json({ batches, settings });
  } catch (err) {
    console.error("places batches", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/resync-report", protect, admin, async (req, res) => {
  try {
    const settings = await PlacesSettings.getOrCreate();
    res.json({
      lastResyncAt: settings.lastResyncAt,
      report: settings.lastResyncReport,
    });
  } catch (err) {
    console.error("places resync report", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/batches/:batchId", protect, admin, async (req, res) => {
  try {
    const batch = await PlaceBatch.findOne({
      batchId: req.params.batchId,
    }).lean();
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    // Hide dismissed (and already staged/promoted) from the batch review table
    const places = await Place.find({
      batchId: req.params.batchId,
      status: { $nin: ["dismissed", "staged", "promoted"] },
    })
      .sort({ name: 1 })
      .limit(2000)
      .lean();
    res.json({ batch, places });
  } catch (err) {
    console.error("places batch detail", err);
    res.status(500).json({ message: "Server error" });
  }
});

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function placeSummary(p) {
  if (!p) return null;
  return {
    _id: p._id,
    gersId: p.gersId,
    name: p.name,
    nameRaw: p.nameRaw,
    street: p.address?.street || p.address?.freeform || "",
    city: p.address?.locality || "",
    status: p.status,
  };
}

async function findSameNamePlaceSiblings(place) {
  const name = String(place.name || "").trim();
  if (!name) return [];
  const nameRegex = new RegExp(`^${escapeRegex(name)}$`, "i");
  const siblingStatuses = [
    "pending_review",
    "active",
    "low_confidence",
    "staged",
  ];
  const query = {
    _id: { $ne: place._id },
    name: nameRegex,
    status: { $in: siblingStatuses },
  };
  if (place.cityId) {
    query.cityId = place.cityId;
  } else if (place.address?.locality) {
    query["address.locality"] = new RegExp(
      `^${escapeRegex(place.address.locality)}$`,
      "i"
    );
  } else {
    return [];
  }
  const siblings = await Place.find(query).sort({ name: 1 }).limit(50).lean();
  return siblings.map((s) => ({
    _id: s._id,
    name: s.name,
    street: s.address?.street || s.address?.freeform || "",
    city: s.address?.locality || "",
    status: s.status,
  }));
}

// GET /places/staged — places awaiting verify → restaurant
router.get("/staged", protect, admin, async (req, res) => {
  try {
    const places = await Place.find({ status: "staged" })
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();
    const items = [];
    for (const p of places) {
      const siblings = await findSameNamePlaceSiblings(p);
      items.push({
        place: p,
        preview: buildStagePreview(p),
        siblings,
      });
    }
    res.json({ items });
  } catch (err) {
    console.error("places staged list", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /places/batches/:batchId/stage/:placeId
router.post(
  "/batches/:batchId/stage/:placeId",
  protect,
  admin,
  async (req, res) => {
    try {
      const place = await Place.findOne({
        _id: req.params.placeId,
        batchId: req.params.batchId,
      });
      if (!place) return res.status(404).json({ message: "Place not found" });
      if (place.status === "dismissed") {
        return res.status(400).json({ message: "Place was dismissed" });
      }
      if (place.status === "promoted") {
        return res.status(400).json({ message: "Place already promoted" });
      }

      place.status = "staged";
      place.updatedAt = new Date();
      await place.save();

      res.json({
        place,
        preview: buildStagePreview(place),
      });
    } catch (err) {
      console.error("places stage", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /places/staged/:placeId/unstage
router.post("/staged/:placeId/unstage", protect, admin, async (req, res) => {
  try {
    const place = await Place.findById(req.params.placeId);
    if (!place) return res.status(404).json({ message: "Place not found" });
    if (place.status !== "staged") {
      return res.status(400).json({ message: "Place is not staged" });
    }
    place.status = "pending_review";
    place.updatedAt = new Date();
    await place.save();
    res.json({ place });
  } catch (err) {
    console.error("places unstage", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /places/staged/:placeId/verify — create restaurant from staged place
router.post("/staged/:placeId/verify", protect, admin, async (req, res) => {
  try {
    const place = await Place.findById(req.params.placeId);
    if (!place) return res.status(404).json({ message: "Place not found" });
    if (place.status !== "staged") {
      return res.status(400).json({ message: "Place is not staged" });
    }

    const preview = buildStagePreview(place);
    const body = req.body || {};
    const name = body.name != null ? String(body.name).trim() : preview.name;
    const type = body.type || preview.type;
    let cuisine = body.cuisine;
    if (typeof cuisine === "string") cuisine = [cuisine];
    if (!Array.isArray(cuisine) || !cuisine.length) cuisine = preview.cuisine;
    const allowedCuisine = [];
    for (const raw of cuisine || []) {
      const val = String(raw || "").trim();
      if (!val || val === "Add +") continue;
      if (val === "Other" || (await isAllowedCuisine(val))) {
        if (!allowedCuisine.some((c) => c.toLowerCase() === val.toLowerCase())) {
          allowedCuisine.push(val);
        }
      }
    }
    if (!allowedCuisine.length) {
      return res.status(400).json({ message: "Select at least one cuisine" });
    }
    cuisine = allowedCuisine;
    const website =
      body.website !== undefined ? String(body.website || "").trim() : preview.website;
    const address = {
      street: body.address?.street ?? preview.address.street,
      city: body.address?.city ?? preview.address.city,
      province: body.address?.province ?? preview.address.province,
      country: body.address?.country ?? preview.address.country,
      postalCode: body.address?.postalCode ?? preview.address.postalCode,
    };

    // Record learning corrections for fields the admin changed vs source
    if (name && name !== place.nameRaw && name !== place.name) {
      await PlaceCorrection.create({
        ruleType: "name_normalize",
        match: { nameRaw: place.nameRaw, nameNormalized: place.name },
        action: { name },
        batchId: place.batchId,
        createdBy: req.user._id,
      });
    }
    const cuisinePrimary = cuisine[0];
    if (
      cuisinePrimary &&
      place.sourceCategory &&
      cuisinePrimary !== place.cuisineHint
    ) {
      await PlaceCorrection.create({
        ruleType: "cuisine_hint",
        match: { sourceCategory: place.sourceCategory },
        action: { cuisineHint: cuisinePrimary },
        batchId: place.batchId,
        createdBy: req.user._id,
      });
      place.cuisineHint = cuisinePrimary;
    }
    if (type && type !== preview.type) {
      await PlaceCorrection.create({
        ruleType: "field_override",
        match: {
          sourceCategory: place.sourceCategory,
          nameRaw: place.nameRaw,
        },
        action: { field: "type", type },
        batchId: place.batchId,
        createdBy: req.user._id,
      });
    }
    if (website !== (place.website || "")) {
      await PlaceCorrection.create({
        ruleType: "field_override",
        match: {
          sourceCategory: place.sourceCategory,
          nameRaw: place.nameRaw,
          gersId: place.gersId,
        },
        action: { field: "website", website },
        batchId: place.batchId,
        createdBy: req.user._id,
      });
    }

    await place.save();

    const result = await promotePlace(place._id, {
      userId: req.user._id,
      name,
      type,
      cuisine,
      website,
      address,
    });

    // Optional: apply same categories to other same-name locations
    const alsoPlaceIds = Array.isArray(body.alsoPlaceIds)
      ? body.alsoPlaceIds.map(String).filter((id) => id !== String(place._id))
      : [];
    const siblingResults = [];
    for (const siblingId of alsoPlaceIds) {
      try {
        const sibling = await Place.findById(siblingId);
        if (!sibling) {
          siblingResults.push({ placeId: siblingId, error: "Place not found" });
          continue;
        }
        if (["dismissed", "promoted"].includes(sibling.status)) {
          siblingResults.push({
            placeId: siblingId,
            error: `Place is ${sibling.status}`,
          });
          continue;
        }
        // Use verified categories/website; sibling keeps its own address/location
        if (sibling.status !== "staged") {
          sibling.status = "staged";
          sibling.updatedAt = new Date();
          await sibling.save();
        }
        const siblingResult = await promotePlace(sibling._id, {
          userId: req.user._id,
          name: sibling.name,
          type,
          cuisine,
          website,
        });
        siblingResults.push({
          placeId: sibling._id,
          restaurantId: siblingResult.restaurantId,
          alreadyPromoted: !!siblingResult.alreadyPromoted,
        });
      } catch (siblingErr) {
        siblingResults.push({
          placeId: siblingId,
          error: siblingErr.message || "Promote failed",
        });
      }
    }

    const updated = await Place.findById(place._id).lean();
    res.json({
      place: updated,
      restaurant: result,
      siblings: siblingResults,
    });
  } catch (err) {
    console.error("places verify", err);
    res.status(400).json({ message: err.message || "Verify failed" });
  }
});

router.patch("/batches/:batchId/places/:placeId", protect, admin, async (req, res) => {
  try {
    const place = await Place.findOne({
      _id: req.params.placeId,
      batchId: req.params.batchId,
    });
    if (!place) return res.status(404).json({ message: "Place not found" });

    const before = {
      name: place.name,
      cuisineHint: place.cuisineHint,
      cityId: place.cityId,
      status: place.status,
    };

    const fields = [
      "name",
      "unitLabel",
      "cuisineHint",
      "website",
      "status",
      "cityAssignment",
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) place[f] = req.body[f];
    }
    if (req.body.address) {
      place.address = { ...place.address.toObject?.() || place.address, ...req.body.address };
    }
    if (req.body.cityId !== undefined) place.cityId = req.body.cityId;
    place.updatedAt = new Date();
    await place.save();

    // Learn from edit
    if (req.body.name && req.body.name !== before.name) {
      await PlaceCorrection.create({
        ruleType: "name_normalize",
        match: { nameRaw: place.nameRaw, nameNormalized: before.name },
        action: { name: place.name, unitLabel: place.unitLabel },
        batchId: place.batchId,
        createdBy: req.user._id,
      });
    }
    if (
      req.body.cuisineHint &&
      req.body.cuisineHint !== before.cuisineHint &&
      place.sourceCategory
    ) {
      await PlaceCorrection.create({
        ruleType: "cuisine_hint",
        match: { sourceCategory: place.sourceCategory },
        action: { cuisineHint: place.cuisineHint },
        batchId: place.batchId,
        createdBy: req.user._id,
      });
    }
    if (
      req.body.cityId &&
      String(req.body.cityId) !== String(before.cityId || "")
    ) {
      await PlaceCorrection.create({
        ruleType: "city_reassign",
        match: { gersId: place.gersId },
        action: { cityId: place.cityId, cityAssignment: place.cityAssignment },
        batchId: place.batchId,
        createdBy: req.user._id,
      });
    }

    const batch = await PlaceBatch.findOne({ batchId: place.batchId });
    if (batch) {
      batch.editedRows = (batch.editedRows || 0) + 1;
      batch.editRate =
        batch.totalRows > 0 ? batch.editedRows / batch.totalRows : 0;
      batch.updatedAt = new Date();
      await batch.save();
    }

    res.json({ place, batch });
  } catch (err) {
    console.error("places patch", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/batches/:batchId/approve", protect, admin, async (req, res) => {
  try {
    const batch = await PlaceBatch.findOne({ batchId: req.params.batchId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    await Place.updateMany(
      {
        batchId: batch.batchId,
        status: "pending_review",
        cityAssignment: { $ne: "unassigned" },
      },
      { $set: { status: "active", updatedAt: new Date() } }
    );

    batch.status = "approved";
    batch.approvedAt = new Date();
    batch.approvedBy = req.user._id;
    batch.updatedAt = new Date();
    await batch.save();

    res.json({ batch });
  } catch (err) {
    console.error("places approve", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/batches/:batchId/dismiss/:placeId", protect, admin, async (req, res) => {
  try {
    await Place.updateOne(
      { _id: req.params.placeId, batchId: req.params.batchId },
      { $set: { status: "dismissed", updatedAt: new Date() } }
    );
    await PlaceCorrection.create({
      ruleType: "dismiss",
      match: {},
      action: { placeId: req.params.placeId },
      batchId: req.params.batchId,
      createdBy: req.user._id,
    });
    const batch = await PlaceBatch.findOne({ batchId: req.params.batchId });
    if (batch) {
      batch.dismissedRows = (batch.dismissedRows || 0) + 1;
      batch.updatedAt = new Date();
      await batch.save();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("places dismiss", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/settings", protect, admin, async (req, res) => {
  const settings = await PlacesSettings.getOrCreate();
  res.json(settings);
});

router.put("/settings", protect, admin, async (req, res) => {
  const settings = await PlacesSettings.getOrCreate();
  if (typeof req.body.autopilotEnabled === "boolean") {
    settings.autopilotEnabled = req.body.autopilotEnabled;
  }
  settings.updatedAt = new Date();
  await settings.save();
  res.json(settings);
});

router.get("/queue", protect, admin, async (req, res) => {
  try {
    const items = await PlaceReviewQueue.find({ resolvedAt: null })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const gersIds = new Set();
    for (const item of items) {
      if (item.type === "duplicate") {
        if (item.payload?.placeGersId) gersIds.add(item.payload.placeGersId);
        if (item.payload?.otherGersId) gersIds.add(item.payload.otherGersId);
      }
    }

    const placesByGers = new Map();
    if (gersIds.size) {
      const places = await Place.find({
        gersId: { $in: [...gersIds] },
      }).lean();
      for (const p of places) placesByGers.set(p.gersId, p);
    }

    const enriched = items.map((item) => {
      if (item.type !== "duplicate") return item;
      const a = placesByGers.get(item.payload?.placeGersId);
      const b = placesByGers.get(item.payload?.otherGersId);
      return {
        ...item,
        places: {
          a: placeSummary(a),
          b: placeSummary(b),
          distanceM: item.payload?.distanceM ?? null,
        },
      };
    });

    res.json({ items: enriched });
  } catch (err) {
    console.error("places queue", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /places/queue/:queueId/resolve — merge or keep_separate duplicates
router.post("/queue/:queueId/resolve", protect, admin, async (req, res) => {
  try {
    const item = await PlaceReviewQueue.findById(req.params.queueId);
    if (!item) return res.status(404).json({ message: "Queue item not found" });
    if (item.resolvedAt) {
      return res.status(400).json({ message: "Already resolved" });
    }
    if (item.type !== "duplicate") {
      return res
        .status(400)
        .json({ message: "Only duplicate queue items can be resolved here" });
    }

    const resolution = req.body?.resolution;
    if (!["merge", "keep_separate"].includes(resolution)) {
      return res.status(400).json({
        message: 'resolution must be "merge" or "keep_separate"',
      });
    }

    const placeGersId = item.payload?.placeGersId;
    const otherGersId = item.payload?.otherGersId;
    if (!placeGersId || !otherGersId) {
      return res.status(400).json({ message: "Queue item missing gersIds" });
    }

    const placeA = await Place.findOne({ gersId: placeGersId });
    const placeB = await Place.findOne({ gersId: otherGersId });
    if (!placeA || !placeB) {
      return res.status(404).json({
        message: "One or both places no longer exist",
      });
    }

    if (resolution === "merge") {
      const keepGersId = req.body?.keepGersId;
      if (![placeGersId, otherGersId].includes(keepGersId)) {
        return res.status(400).json({
          message: "keepGersId must be one of the duplicate places",
        });
      }
      const keeper = keepGersId === placeA.gersId ? placeA : placeB;
      const loser = keepGersId === placeA.gersId ? placeB : placeA;

      const gersIds = new Set([
        ...(keeper.gersIds || []),
        keeper.gersId,
        loser.gersId,
        ...(loser.gersIds || []),
      ]);
      keeper.gersIds = [...gersIds];
      if (keeper.status === "suspect_duplicate") {
        keeper.status = "pending_review";
      }
      keeper.updatedAt = new Date();
      await keeper.save();

      loser.status = "dismissed";
      loser.updatedAt = new Date();
      await loser.save();

      await PlaceCorrection.create({
        ruleType: "dedupe_merge",
        match: { gersId: keeper.gersId },
        action: {
          keepGersId: keeper.gersId,
          mergedGersId: loser.gersId,
          mergedGersIds: loser.gersIds || [loser.gersId],
        },
        batchId: keeper.batchId || loser.batchId,
        createdBy: req.user._id,
      });

      item.resolution = `merge:keep=${keeper.gersId};dismiss=${loser.gersId}`;
    } else {
      // keep_separate
      for (const p of [placeA, placeB]) {
        if (p.status === "suspect_duplicate") {
          p.status = "pending_review";
          p.updatedAt = new Date();
          await p.save();
        }
      }
      await PlaceCorrection.create({
        ruleType: "dedupe_keep_separate",
        match: { gersId: placeGersId },
        action: {
          placeGersId,
          otherGersId,
        },
        batchId: placeA.batchId || placeB.batchId,
        createdBy: req.user._id,
      });
      item.resolution = "keep_separate";
    }

    item.resolvedAt = new Date();
    await item.save();

    res.json({ ok: true, item });
  } catch (err) {
    console.error("places queue resolve", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reconcile", protect, admin, async (req, res) => {
  try {
    const result = await reconcilePlaces({
      limit: Math.min(parseInt(req.body.limit || "500", 10), 2000),
    });
    res.json(result);
  } catch (err) {
    console.error("places reconcile", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
