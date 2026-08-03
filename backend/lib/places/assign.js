/**
 * CSD point-in-polygon assignment + nearest publishable city fallback (15 km).
 */

const booleanPointInPolygon = require("@turf/boolean-point-in-polygon");
const nearestPoint = require("@turf/nearest-point");

const NEAREST_MAX_KM = 15;

function asPoint(coordinates) {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates },
  };
}

function haversineKm(lng1, lat1, lng2, lat2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * @param {[number, number]} coordinates [lng, lat]
 * @param {Array} cities lean City docs with boundarySimplified and/or centroid
 */
function assignCity(coordinates, cities) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return { cityId: null, csdUid: null, cityAssignment: "unassigned" };
  }

  const pt = asPoint(coordinates);
  const bip =
    typeof booleanPointInPolygon === "function"
      ? booleanPointInPolygon
      : booleanPointInPolygon.default;

  for (const city of cities) {
    if (!city.isPublishable) continue;
    const boundary = city.boundarySimplified;
    if (boundary && boundary.type && boundary.coordinates) {
      try {
        const poly =
          boundary.type === "Feature"
            ? boundary
            : { type: "Feature", properties: {}, geometry: boundary };
        if (bip(pt, poly)) {
          return {
            cityId: city._id,
            csdUid: city.csdUid,
            cityAssignment: "within",
          };
        }
      } catch {
        // ignore invalid polygons
      }
    }
  }

  const publishable = cities.filter(
    (c) => c.isPublishable && c.centroid?.coordinates?.length === 2
  );
  if (publishable.length === 0) {
    return { cityId: null, csdUid: null, cityAssignment: "unassigned" };
  }

  // Pure nearest by haversine — avoid extra turf helpers dependency
  let best = null;
  let bestKm = Infinity;
  const [lng, lat] = coordinates;
  for (const c of publishable) {
    const [cLng, cLat] = c.centroid.coordinates;
    const km = haversineKm(lng, lat, cLng, cLat);
    if (km < bestKm) {
      bestKm = km;
      best = c;
    }
  }

  if (best && bestKm <= NEAREST_MAX_KM) {
    return {
      cityId: best._id,
      csdUid: best.csdUid,
      cityAssignment: "nearest",
      distanceKm: bestKm,
    };
  }

  // nearestPoint kept as optional validation helper for tests
  void nearestPoint;

  return {
    cityId: null,
    csdUid: null,
    cityAssignment: "unassigned",
    distanceKm: bestKm,
  };
}

module.exports = {
  assignCity,
  haversineKm,
  NEAREST_MAX_KM,
};
