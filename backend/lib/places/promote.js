/**
 * Promote a place → restaurant on first published review.
 * Idempotent. Uses a transaction when supported; falls back otherwise.
 */

const mongoose = require("mongoose");
const Place = require("../../models/Place");
const Restaurant = require("../../models/Restaurant");
const Address = require("../../models/Address");
const { allocateSlug } = require("../seo/slugs");

async function promotePlace(placeId, { userId, cuisine, type } = {}) {
  const place = await Place.findById(placeId);
  if (!place) throw new Error("place_not_found");

  if (place.status === "promoted" && place.restaurantId) {
    return { restaurantId: place.restaurantId, alreadyPromoted: true };
  }

  const run = async (session) => {
    const opts = session ? { session } : {};
    const addressDocs = await Address.create(
      [
        {
          street: place.address?.street || place.address?.freeform || "Unknown",
          city: place.address?.locality || "Unknown",
          province: place.address?.region || "",
          country: place.address?.country || "Canada",
          postalCode: place.address?.postcode || "",
        },
      ],
      opts
    );

    const slug = await allocateSlug(Restaurant, place.name);
    const restaurantDocs = await Restaurant.create(
      [
        {
          name: place.name,
          address: addressDocs[0]._id,
          type: type || "Casual Dining",
          cuisine: Array.isArray(cuisine)
            ? cuisine
            : cuisine
              ? [cuisine]
              : place.cuisineHint
                ? [place.cuisineHint]
                : ["Other"],
          createdBy: userId,
          slug,
          cityId: place.cityId,
          gersId: place.gersId,
          brandName: place.brandName || null,
          website: place.website,
          location: place.location,
          countryCode: "ca",
        },
      ],
      opts
    );

    place.status = "promoted";
    place.restaurantId = restaurantDocs[0]._id;
    place.updatedAt = new Date();
    await place.save(opts);

    return {
      restaurantId: restaurantDocs[0]._id,
      addressId: addressDocs[0]._id,
      alreadyPromoted: false,
    };
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await run(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch {
      /* ignore */
    }
    // Standalone Mongo / transaction unsupported — retry without session
    if (
      String(err.message || "").includes("Transaction") ||
      err.code === 20 ||
      err.codeName === "IllegalOperation"
    ) {
      return run(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  promotePlace,
};
