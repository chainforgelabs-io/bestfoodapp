/**
 * Promote a place → restaurant on first published review or admin verify.
 * Idempotent. Uses a transaction when supported; falls back otherwise.
 */

const mongoose = require("mongoose");
const Place = require("../../models/Place");
const Restaurant = require("../../models/Restaurant");
const Address = require("../../models/Address");
const { allocateSlug } = require("../seo/slugs");
const { mapOvertureCategory, DEFAULT_TYPE } = require("./categoryMap");
const { normalizeAddressFields } = require("./addressNormalize");

/**
 * @param {string} placeId
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string|string[]} [opts.cuisine]
 * @param {string} [opts.type]
 * @param {string} [opts.name]
 * @param {string} [opts.website]
 * @param {object} [opts.address] - { street, city, province, country, postalCode }
 */
async function promotePlace(placeId, opts = {}) {
  const { userId, cuisine, type, name, website, address: addressOverride } =
    opts;
  const place = await Place.findById(placeId);
  if (!place) throw new Error("place_not_found");

  if (place.status === "promoted" && place.restaurantId) {
    return { restaurantId: place.restaurantId, alreadyPromoted: true };
  }

  const mapped = mapOvertureCategory({
    sourceCategory: place.sourceCategory,
    cuisineHint: place.cuisineHint,
  });

  let cuisineList;
  if (Array.isArray(cuisine) && cuisine.length) {
    cuisineList = cuisine;
  } else if (cuisine) {
    cuisineList = [cuisine];
  } else {
    cuisineList = [mapped.cuisine];
  }

  const restaurantType = type || mapped.type || DEFAULT_TYPE;
  const restaurantName = (name && String(name).trim()) || place.name;
  const restaurantWebsite =
    website !== undefined ? website || null : place.website;

  const normalizedAddress = normalizeAddressFields({
    street:
      addressOverride?.street ||
      place.address?.street ||
      place.address?.freeform ||
      "Unknown",
    city: addressOverride?.city || place.address?.locality || "Unknown",
    province: addressOverride?.province || place.address?.region || "",
    country: addressOverride?.country || place.address?.country || "Canada",
    postalCode: addressOverride?.postalCode || place.address?.postcode || "",
  });

  const run = async (session) => {
    const optsSession = session ? { session } : {};
    const addressDocs = await Address.create(
      [normalizedAddress],
      optsSession
    );

    const slug = await allocateSlug(Restaurant, restaurantName);
    const restaurantDocs = await Restaurant.create(
      [
        {
          name: restaurantName,
          address: addressDocs[0]._id,
          type: restaurantType,
          cuisine: cuisineList,
          createdBy: userId,
          slug,
          cityId: place.cityId,
          gersId: place.gersId,
          brandName: place.brandName || null,
          website: restaurantWebsite,
          location: place.location,
          countryCode: "ca",
        },
      ],
      optsSession
    );

    if (!place.cuisineHint || place.cuisineHint === place.sourceCategory) {
      place.cuisineHint = cuisineList[0] || mapped.cuisine;
    }
    if (name && String(name).trim() && String(name).trim() !== place.name) {
      place.name = String(name).trim();
    }
    place.status = "promoted";
    place.restaurantId = restaurantDocs[0]._id;
    place.updatedAt = new Date();
    await place.save(optsSession);

    return {
      restaurantId: restaurantDocs[0]._id,
      addressId: addressDocs[0]._id,
      alreadyPromoted: false,
      type: restaurantType,
      cuisine: cuisineList,
      slug,
      name: restaurantName,
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

function buildStagePreview(place) {
  const mapped = mapOvertureCategory({
    sourceCategory: place.sourceCategory,
    cuisineHint: place.cuisineHint,
  });
  return {
    name: place.name,
    type: mapped.type || DEFAULT_TYPE,
    cuisine: [mapped.cuisine],
    website: place.website || "",
    address: normalizeAddressFields({
      street: place.address?.street || place.address?.freeform || "",
      city: place.address?.locality || "",
      province: place.address?.region || "",
      country: place.address?.country || "Canada",
      postalCode: place.address?.postcode || "",
    }),
    sourceCategory: place.sourceCategory || null,
    cuisineHint: place.cuisineHint || null,
  };
}

module.exports = {
  promotePlace,
  buildStagePreview,
};
