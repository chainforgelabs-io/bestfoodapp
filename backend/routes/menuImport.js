const express = require("express");
const mongoose = require("mongoose");
const MenuImport = require("../models/MenuImport");
const MenuImportChange = require("../models/MenuImportChange");
const FoodItem = require("../models/FoodItem");
const Restaurant = require("../models/Restaurant");
const Address = require("../models/Address");
const Review = require("../models/Review");
const Place = require("../models/Place");
const { protect, admin } = require("../middleware/authMiddleware");
const { extractMenuFromImages } = require("../lib/menu/extractMenu");
const { diffMenuItems } = require("../lib/menu/diffMenuItems");
const { validateProposed } = require("../lib/menu/taxonomy");

const router = express.Router();

router.use(protect, admin);

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildChangeDocs({ menuImportId, restaurantId, adds, updates, userId }) {
  return [
    ...adds.map((a) => ({
      menuImport: menuImportId,
      restaurant: restaurantId,
      action: "add",
      status: "pending",
      proposed: {
        name: a.proposed.name,
        category: a.proposed.category,
        type: a.proposed.type,
        subType: a.proposed.subType,
        price: a.proposed.price,
        sizeOptions: a.proposed.sizeOptions || "",
        tags: a.proposed.tags || [],
      },
      sourceImageKeys: a.sourceImageKeys || [],
      createdBy: userId,
    })),
    ...updates.map((u) => ({
      menuImport: menuImportId,
      restaurant: restaurantId,
      action: "update",
      status: "pending",
      matchedFoodItem: u.matchedFoodItem,
      proposed: {
        name: u.proposed.name,
        category: u.proposed.category,
        type: u.proposed.type,
        subType: u.proposed.subType,
        price: u.proposed.price,
        sizeOptions: u.proposed.sizeOptions || "",
        tags: u.proposed.tags || [],
      },
      existing: u.existing,
      sourceImageKeys: u.sourceImageKeys || [],
      createdBy: userId,
    })),
  ];
}

async function queueDiffForRestaurant({
  menuImportId,
  restaurantId,
  items,
  userId,
}) {
  const existingItems = await FoodItem.find({ restaurant: restaurantId });
  const { adds, updates, unchanged } = diffMenuItems(items, existingItems);

  await MenuImportChange.deleteMany({
    menuImport: menuImportId,
    status: "pending",
  });

  const toCreate = buildChangeDocs({
    menuImportId,
    restaurantId,
    adds,
    updates,
    userId,
  });
  if (toCreate.length) {
    await MenuImportChange.insertMany(toCreate);
  }

  return {
    adds: adds.length,
    updates: updates.length,
    unchanged,
    queued: toCreate.length,
  };
}

async function findSameNameSiblings(restaurantId) {
  const primary = await Restaurant.findById(restaurantId)
    .populate("address")
    .lean();
  if (!primary) return { primary: null, siblings: [] };

  const name = String(primary.name || "").trim();
  if (!name) return { primary, siblings: [] };

  const nameRegex = new RegExp(`^${escapeRegex(name)}$`, "i");
  let siblings = [];

  if (primary.cityId) {
    siblings = await Restaurant.find({
      _id: { $ne: primary._id },
      name: nameRegex,
      cityId: primary.cityId,
    })
      .populate("address")
      .lean();
  } else if (primary.address?.city) {
    const addressQuery = {
      city: new RegExp(`^${escapeRegex(primary.address.city)}$`, "i"),
    };
    if (primary.address.province) {
      addressQuery.province = new RegExp(
        `^${escapeRegex(primary.address.province)}$`,
        "i"
      );
    }
    if (primary.address.country) {
      addressQuery.country = new RegExp(
        `^${escapeRegex(primary.address.country)}$`,
        "i"
      );
    }
    const addresses = await Address.find(addressQuery).select("_id").lean();
    const addressIds = addresses.map((a) => a._id);
    if (addressIds.length) {
      siblings = await Restaurant.find({
        _id: { $ne: primary._id },
        name: nameRegex,
        address: { $in: addressIds },
      })
        .populate("address")
        .lean();
    }
  }

  return { primary, siblings };
}

async function applyChange(change, adminUser) {
  const validated = await validateProposed(change.proposed);
  if (!validated.ok) {
    const err = new Error(validated.message);
    err.code = "VALIDATION";
    throw err;
  }
  const proposed = validated.value;

  if (change.action === "add") {
    const foodItem = new FoodItem({
      restaurant: change.restaurant,
      name: proposed.name,
      category: proposed.category,
      type: proposed.type,
      subType: proposed.subType,
      price: proposed.price,
      tags: proposed.tags,
      sizeOptions: proposed.sizeOptions || "",
      createdBy: adminUser._id,
    });
    await foodItem.save();
    change.matchedFoodItem = foodItem._id;
  } else if (change.action === "update") {
    if (!change.matchedFoodItem) {
      const err = new Error("update change missing matchedFoodItem");
      err.code = "VALIDATION";
      throw err;
    }
    const foodItem = await FoodItem.findById(change.matchedFoodItem);
    if (!foodItem) {
      const err = new Error("matched food item not found");
      err.code = "NOT_FOUND";
      throw err;
    }
    foodItem.name = proposed.name;
    foodItem.category = proposed.category;
    foodItem.type = proposed.type;
    foodItem.subType = proposed.subType;
    foodItem.price = proposed.price;
    foodItem.tags = proposed.tags;
    foodItem.sizeOptions = proposed.sizeOptions || "";
    foodItem.updatedAt = new Date();
    await foodItem.save();
  } else {
    const err = new Error("unknown action");
    err.code = "VALIDATION";
    throw err;
  }

  change.status = "approved";
  change.proposed = proposed;
  change.reviewedBy = adminUser._id;
  change.reviewedAt = new Date();
  await change.save();
  return change;
}

// GET /api/menu-imports/siblings/:restaurantId — same name in same city
router.get("/siblings/:restaurantId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }
    const { primary, siblings } = await findSameNameSiblings(
      req.params.restaurantId
    );
    if (!primary) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json({
      restaurant: {
        _id: primary._id,
        name: primary.name,
        address: primary.address,
      },
      siblings: siblings.map((s) => ({
        _id: s._id,
        name: s.name,
        address: s.address
          ? {
              street: s.address.street,
              city: s.address.city,
              province: s.address.province,
              country: s.address.country,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error("menu-imports siblings", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/menu-imports/queue — pending changes
router.get("/queue", async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const filter = status === "all" ? {} : { status };
    const items = await MenuImportChange.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("restaurant", "name")
      .populate("menuImport", "status createdAt")
      .lean();
    res.json({ items });
  } catch (err) {
    console.error("menu-imports queue", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/menu-imports/todo
 * Incomplete menu coverage for:
 *  (a) restaurants promoted from places (verified/staged-verified)
 *  (b) restaurants that already have food items or reviews
 * Complete = at least one MenuImport ready AND zero pending MenuImportChange rows.
 */
router.get("/todo", async (req, res) => {
  try {
    const [promotedPlaces, foodRestaurantIds, reviewRestaurantIds] =
      await Promise.all([
        Place.find({
          status: "promoted",
          restaurantId: { $ne: null },
        })
          .select("restaurantId")
          .lean(),
        FoodItem.distinct("restaurant"),
        Review.distinct("restaurantId"),
      ]);

    const fromPlaces = new Set(
      promotedPlaces
        .map((p) => p.restaurantId?.toString())
        .filter(Boolean)
    );
    const fromExisting = new Set([
      ...foodRestaurantIds.map((id) => id.toString()),
      ...reviewRestaurantIds.map((id) => id.toString()),
    ]);

    const allIds = [
      ...new Set([...fromPlaces, ...fromExisting]),
    ].filter((id) => mongoose.isValidObjectId(id));

    if (!allIds.length) {
      return res.json({ items: [] });
    }

    const objectIds = allIds.map((id) => new mongoose.Types.ObjectId(id));

    const [restaurants, foodCounts, readyImports, pendingChanges] =
      await Promise.all([
        Restaurant.find({ _id: { $in: objectIds } })
          .select("name type cuisine slug gersId")
          .lean(),
        FoodItem.aggregate([
          { $match: { restaurant: { $in: objectIds } } },
          { $group: { _id: "$restaurant", count: { $sum: 1 } } },
        ]),
        MenuImport.find({
          restaurant: { $in: objectIds },
          status: "ready",
        })
          .select("restaurant")
          .lean(),
        MenuImportChange.aggregate([
          {
            $match: {
              restaurant: { $in: objectIds },
              status: "pending",
            },
          },
          { $group: { _id: "$restaurant", count: { $sum: 1 } } },
        ]),
      ]);

    const foodCountMap = new Map(
      foodCounts.map((r) => [r._id.toString(), r.count])
    );
    const pendingMap = new Map(
      pendingChanges.map((r) => [r._id.toString(), r.count])
    );
    const hasReadyImport = new Set(
      readyImports.map((r) => r.restaurant.toString())
    );

    const items = [];
    for (const restaurant of restaurants) {
      const id = restaurant._id.toString();
      const foodItemCount = foodCountMap.get(id) || 0;
      const pendingChangeCount = pendingMap.get(id) || 0;
      const hasImport = hasReadyImport.has(id);
      const complete = hasImport && pendingChangeCount === 0;
      if (complete) continue;

      const sources = [];
      if (fromPlaces.has(id)) sources.push("places_verified");
      if (fromExisting.has(id)) sources.push("existing");

      let state = "no_menu_uploaded";
      if (hasImport && pendingChangeCount > 0) {
        state = "awaiting_verification";
      } else if (!hasImport && foodItemCount > 0) {
        state = "has_items_no_import";
      }

      items.push({
        restaurantId: restaurant._id,
        name: restaurant.name,
        type: restaurant.type,
        cuisine: restaurant.cuisine,
        slug: restaurant.slug,
        foodItemCount,
        pendingChangeCount,
        hasImport,
        state,
        sources,
      });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ items });
  } catch (err) {
    console.error("menu-imports todo", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/menu-imports/changes/:changeId
router.patch("/changes/:changeId", async (req, res) => {
  try {
    const change = await MenuImportChange.findById(req.params.changeId);
    if (!change) return res.status(404).json({ message: "Change not found" });
    if (change.status !== "pending") {
      return res.status(400).json({ message: "Only pending changes can be edited" });
    }

    const current =
      typeof change.proposed?.toObject === "function"
        ? change.proposed.toObject()
        : change.proposed;
    const validated = await validateProposed({
      ...current,
      ...(req.body.proposed || req.body),
    });
    if (!validated.ok) {
      return res.status(400).json({ message: validated.message });
    }

    change.proposed = validated.value;
    await change.save();
    const populated = await MenuImportChange.findById(change._id)
      .populate("restaurant", "name")
      .lean();
    res.json({ change: populated });
  } catch (err) {
    console.error("menu-imports patch change", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/menu-imports/changes/approve-batch
router.post("/changes/approve-batch", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ message: "ids array required" });
    }

    const results = { approved: [], errors: [] };
    for (const id of ids) {
      try {
        const change = await MenuImportChange.findById(id);
        if (!change) {
          results.errors.push({ id, message: "not found" });
          continue;
        }
        if (change.status !== "pending") {
          results.errors.push({ id, message: "not pending" });
          continue;
        }
        await applyChange(change, req.user);
        results.approved.push(String(change._id));
      } catch (e) {
        results.errors.push({ id, message: e.message || "failed" });
      }
    }
    res.json(results);
  } catch (err) {
    console.error("menu-imports approve-batch", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/menu-imports/changes/:changeId/approve
router.post("/changes/:changeId/approve", async (req, res) => {
  try {
    const change = await MenuImportChange.findById(req.params.changeId);
    if (!change) return res.status(404).json({ message: "Change not found" });
    if (change.status !== "pending") {
      return res.status(400).json({ message: "Change is not pending" });
    }

    // Allow last-second edits in the same approve call
    if (req.body?.proposed) {
      const validated = await validateProposed(req.body.proposed);
      if (!validated.ok) {
        return res.status(400).json({ message: validated.message });
      }
      change.proposed = validated.value;
    }

    await applyChange(change, req.user);
    const populated = await MenuImportChange.findById(change._id)
      .populate("restaurant", "name")
      .lean();
    res.json({ change: populated });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ message: err.message });
    }
    console.error("menu-imports approve", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/menu-imports/changes/:changeId/reject
router.post("/changes/:changeId/reject", async (req, res) => {
  try {
    const change = await MenuImportChange.findById(req.params.changeId);
    if (!change) return res.status(404).json({ message: "Change not found" });
    if (change.status !== "pending") {
      return res.status(400).json({ message: "Change is not pending" });
    }
    change.status = "rejected";
    change.reviewedBy = req.user._id;
    change.reviewedAt = new Date();
    await change.save();
    res.json({ change });
  } catch (err) {
    console.error("menu-imports reject", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/menu-imports
router.post("/", async (req, res) => {
  try {
    const { restaurantId, images } = req.body || {};
    if (!restaurantId) {
      return res.status(400).json({ message: "restaurantId is required" });
    }
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "images array required" });
    }

    const restaurant = await Restaurant.findById(restaurantId).select("_id name");
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const allowedMenuMime = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
    const normalizedImages = images.map((img, idx) => {
      if (!img?.key || !img?.imageBucket) {
        throw Object.assign(new Error(`images[${idx}] needs key and imageBucket`), {
          code: "VALIDATION",
        });
      }
      let contentType = String(img.contentType || "image/jpeg")
        .toLowerCase()
        .split(";")[0]
        .trim();
      if (contentType === "image/jpg") contentType = "image/jpeg";
      if (contentType === "application/pdf") {
        throw Object.assign(
          new Error(
            "PDF must be converted to images before create. Re-select the PDF in the menu import UI."
          ),
          { code: "VALIDATION" }
        );
      }
      if (!allowedMenuMime.has(contentType)) {
        throw Object.assign(
          new Error(
            `Unsupported menu content type "${contentType}". Use JPEG, PNG, WebP, HEIC, or PDF.`
          ),
          { code: "VALIDATION" }
        );
      }
      return {
        key: String(img.key).trim(),
        imageBucket: String(img.imageBucket).trim(),
        contentType,
      };
    });

    const doc = new MenuImport({
      restaurant: restaurant._id,
      images: normalizedImages,
      status: "uploaded",
      createdBy: req.user._id,
    });
    await doc.save();

    res.status(201).json({ import: doc, restaurant });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ message: err.message });
    }
    console.error("menu-imports create", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/menu-imports
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const imports = await MenuImport.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("restaurant", "name")
      .lean();
    res.json({ imports });
  } catch (err) {
    console.error("menu-imports list", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/menu-imports/:id/scan
router.post("/:id/scan", async (req, res) => {
  try {
    const doc = await MenuImport.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Import not found" });

    if (doc.status === "scanning") {
      return res.status(409).json({ message: "Scan already in progress" });
    }

    doc.status = "scanning";
    doc.error = undefined;
    await doc.save();

    try {
      const { items, rawAiJson } = await extractMenuFromImages(doc.images);
      const primarySummary = await queueDiffForRestaurant({
        menuImportId: doc._id,
        restaurantId: doc.restaurant,
        items,
        userId: req.user._id,
      });

      doc.status = "ready";
      doc.rawAiJson = rawAiJson;
      doc.error = undefined;
      await doc.save();

      // Optional: apply the same extracted items to other same-name locations
      // (diff only — no second AI call). Body: { alsoRestaurantIds: [] }
      const alsoIds = Array.isArray(req.body?.alsoRestaurantIds)
        ? req.body.alsoRestaurantIds
            .map(String)
            .filter(
              (id) =>
                mongoose.isValidObjectId(id) &&
                id !== String(doc.restaurant)
            )
        : [];

      const siblingResults = [];
      for (const rid of alsoIds) {
        const restaurant = await Restaurant.findById(rid).select("_id name");
        if (!restaurant) {
          siblingResults.push({
            restaurantId: rid,
            error: "Restaurant not found",
          });
          continue;
        }
        const siblingImport = new MenuImport({
          restaurant: restaurant._id,
          images: doc.images,
          status: "ready",
          rawAiJson,
          createdBy: req.user._id,
        });
        await siblingImport.save();
        const summary = await queueDiffForRestaurant({
          menuImportId: siblingImport._id,
          restaurantId: restaurant._id,
          items,
          userId: req.user._id,
        });
        siblingResults.push({
          restaurantId: restaurant._id,
          restaurantName: restaurant.name,
          importId: siblingImport._id,
          summary,
        });
      }

      const changes = await MenuImportChange.find({
        menuImport: {
          $in: [
            doc._id,
            ...siblingResults
              .filter((s) => s.importId)
              .map((s) => s.importId),
          ],
        },
        status: "pending",
      })
        .populate("restaurant", "name")
        .lean();

      const siblingQueued = siblingResults.reduce(
        (sum, s) => sum + (s.summary?.queued || 0),
        0
      );

      res.json({
        import: doc,
        summary: {
          extracted: items.length,
          adds: primarySummary.adds,
          updates: primarySummary.updates,
          unchanged: primarySummary.unchanged,
          queued: primarySummary.queued + siblingQueued,
          locations: 1 + siblingResults.filter((s) => s.importId).length,
        },
        siblings: siblingResults,
        changes,
      });
    } catch (scanErr) {
      console.error("menu-imports scan failed", scanErr);
      doc.status = "failed";
      doc.error = scanErr.message || "Scan failed";
      await doc.save();

      if (scanErr.code === "XAI_NOT_CONFIGURED") {
        return res.status(503).json({
          message: scanErr.message,
          code: scanErr.code,
          import: doc,
        });
      }
      return res.status(502).json({
        message: scanErr.message || "Scan failed",
        code: scanErr.code || "SCAN_FAILED",
        import: doc,
      });
    }
  } catch (err) {
    console.error("menu-imports scan", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/menu-imports/:id
router.get("/:id", async (req, res) => {
  try {
    const doc = await MenuImport.findById(req.params.id)
      .populate("restaurant", "name")
      .lean();
    if (!doc) return res.status(404).json({ message: "Import not found" });

    const changes = await MenuImportChange.find({ menuImport: doc._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ import: doc, changes });
  } catch (err) {
    console.error("menu-imports get", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
