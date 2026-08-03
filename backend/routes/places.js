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
} = require("../lib/places");

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
    const places = await Place.find({ batchId: req.params.batchId })
      .sort({ name: 1 })
      .limit(2000)
      .lean();
    res.json({ batch, places });
  } catch (err) {
    console.error("places batch detail", err);
    res.status(500).json({ message: "Server error" });
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
  const items = await PlaceReviewQueue.find({ resolvedAt: null })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ items });
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
