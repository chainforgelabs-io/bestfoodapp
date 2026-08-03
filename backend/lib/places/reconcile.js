/**
 * Match places against existing restaurants.
 * Auto-link only on exact normalized name + within 150 m.
 */

const Place = require("../../models/Place");
const Restaurant = require("../../models/Restaurant");
const Address = require("../../models/Address");
const PlaceReviewQueue = require("../../models/PlaceReviewQueue");
const { collapseWhitespace } = require("./normalize");
const { haversineKm } = require("./assign");

function normalizeName(name) {
  return collapseWhitespace(name).toLowerCase();
}

async function reconcilePlaces({ limit = 500 } = {}) {
  const places = await Place.find({
    status: { $in: ["active", "pending_review", "low_confidence"] },
    restaurantId: null,
  })
    .limit(limit)
    .lean();

  const restaurants = await Restaurant.find({})
    .populate("address")
    .lean();

  let linked = 0;
  let queued = 0;

  for (const place of places) {
    if (!place.location?.coordinates) {
      await PlaceReviewQueue.create({
        type: "reconcile",
        placeId: place._id,
        reason: "place_missing_coordinates",
        candidateIds: [],
      });
      queued += 1;
      continue;
    }

    const matches = [];
    for (const r of restaurants) {
      if (normalizeName(r.name) !== normalizeName(place.name)) continue;
      if (!r.location?.coordinates) {
        // Without restaurant coords, queue for human if name matches uniquely later
        matches.push({ restaurant: r, distanceM: null });
        continue;
      }
      const distM =
        haversineKm(
          place.location.coordinates[0],
          place.location.coordinates[1],
          r.location.coordinates[0],
          r.location.coordinates[1]
        ) * 1000;
      if (distM <= 150) matches.push({ restaurant: r, distanceM: distM });
    }

    const auto = matches.filter((m) => m.distanceM != null && m.distanceM <= 150);
    if (auto.length === 1) {
      const r = auto[0].restaurant;
      if (r.gersId && r.gersId !== place.gersId) {
        await PlaceReviewQueue.create({
          type: "reconcile",
          placeId: place._id,
          candidateIds: [r._id],
          reason: "gersId_conflict",
        });
        queued += 1;
        continue;
      }
      await Restaurant.updateOne(
        { _id: r._id },
        {
          $set: {
            gersId: place.gersId,
            cityId: place.cityId || r.cityId,
            updatedAt: new Date(),
          },
        }
      );
      await Place.updateOne(
        { _id: place._id },
        {
          $set: {
            status: "promoted",
            restaurantId: r._id,
            updatedAt: new Date(),
          },
        }
      );
      linked += 1;
    } else {
      await PlaceReviewQueue.create({
        type: "reconcile",
        placeId: place._id,
        candidateIds: matches.map((m) => m.restaurant._id),
        reason:
          matches.length === 0 ? "no_name_match" : "ambiguous_or_no_coords",
        payload: { matchCount: matches.length },
      });
      queued += 1;
    }
  }

  // Ensure every restaurant has gersId or an open queue entry
  const remaining = await Restaurant.find({
    $or: [{ gersId: null }, { gersId: { $exists: false } }],
  })
    .select("_id name")
    .lean();

  for (const r of remaining) {
    const open = await PlaceReviewQueue.findOne({
      type: "reconcile",
      candidateIds: r._id,
      resolvedAt: null,
    });
    if (!open) {
      await PlaceReviewQueue.create({
        type: "reconcile",
        placeId: null,
        candidateIds: [r._id],
        reason: "restaurant_unmatched",
      });
      queued += 1;
    }
  }

  return { linked, queued, placesConsidered: places.length };
}

module.exports = {
  reconcilePlaces,
  normalizeName,
};
