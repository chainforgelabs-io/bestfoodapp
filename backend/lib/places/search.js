/**
 * Admin / review-form autocomplete over places + restaurants.
 */

const Place = require("../../models/Place");
const Restaurant = require("../../models/Restaurant");
const { mapOvertureCategory } = require("./categoryMap");

async function searchPlacesAndRestaurants({
  q,
  cityId,
  city,
  province,
  country,
  limit = 20,
  includeLowConfidence = false,
} = {}) {
  const query = String(q || "").trim();
  if (query.length < 2) return [];

  const placeFilter = {
    status: includeLowConfidence
      ? { $in: ["active", "low_confidence", "promoted"] }
      : { $in: ["active", "promoted"] },
    cityAssignment: { $ne: "unassigned" },
    name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
  };
  if (cityId) placeFilter.cityId = cityId;

  const places = await Place.find(placeFilter)
    .select(
      "name address cityId status restaurantId gersId website cuisineHint sourceCategory location"
    )
    .limit(limit)
    .lean();

  const restaurantFilter = {
    name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
  };
  let restaurants = await Restaurant.find(restaurantFilter)
    .populate("address")
    .limit(limit)
    .lean();

  if (city || province || country) {
    const {
      countrySearchPattern,
      provinceSearchPattern,
    } = require("./addressNormalize");
    const countryRe = country
      ? new RegExp(countrySearchPattern(country), "i")
      : null;
    const provinceRe = province
      ? new RegExp(provinceSearchPattern(province) || `^${province}$`, "i")
      : null;
    restaurants = restaurants.filter((r) => {
      const a = r.address || {};
      if (city && a.city?.toLowerCase() !== String(city).toLowerCase()) {
        return false;
      }
      if (provinceRe && a.province && !provinceRe.test(a.province)) {
        return false;
      }
      if (countryRe && a.country && !countryRe.test(a.country)) {
        return false;
      }
      return true;
    });
  }

  const promotedRestaurantIds = new Set(
    places
      .filter((p) => p.restaurantId)
      .map((p) => String(p.restaurantId))
  );

  const results = [];

  for (const r of restaurants) {
    results.push({
      kind: "restaurant",
      id: r._id,
      restaurantId: r._id,
      placeId: null,
      name: r.name,
      street: r.address?.street || "",
      city: r.address?.city || "",
      province: r.address?.province || "",
      website: r.website || null,
      cuisine: r.cuisine || [],
      type: r.type || null,
      cuisineHint: null,
      gersId: r.gersId || null,
      slug: r.slug || null,
    });
  }

  for (const p of places) {
    if (p.restaurantId && promotedRestaurantIds.has(String(p.restaurantId))) {
      continue;
    }
    if (p.status === "promoted" && p.restaurantId) continue;
    const mapped = mapOvertureCategory({
      sourceCategory: p.sourceCategory,
      cuisineHint: p.cuisineHint,
    });
    results.push({
      kind: "place",
      id: p._id,
      restaurantId: null,
      placeId: p._id,
      name: p.name,
      street: p.address?.street || p.address?.freeform || "",
      city: p.address?.locality || "",
      province: p.address?.region || "",
      website: p.website || null,
      cuisine: [mapped.cuisine],
      type: mapped.type,
      cuisineHint: mapped.cuisine,
      sourceCategory: p.sourceCategory || null,
      gersId: p.gersId,
      slug: null,
    });
  }

  return results.slice(0, limit);
}

module.exports = {
  searchPlacesAndRestaurants,
};
