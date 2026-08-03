/**
 * Intra-source duplicate detection.
 * Identical normalized name within 75m → merge.
 * Different names within 25m → suspect_duplicate queue.
 */

const { haversineKm } = require("./assign");

function metersBetween(a, b) {
  if (!a?.coordinates || !b?.coordinates) return Infinity;
  return (
    haversineKm(
      a.coordinates[0],
      a.coordinates[1],
      b.coordinates[0],
      b.coordinates[1]
    ) * 1000
  );
}

/**
 * @param {Array} places normalized place objects (in-memory batch)
 * @returns {{ kept: Array, merges: Array, suspects: Array }}
 */
function dedupeBatch(places) {
  const kept = [];
  const merges = [];
  const suspects = [];
  const used = new Set();

  for (let i = 0; i < places.length; i += 1) {
    if (used.has(i)) continue;
    const a = places[i];
    let survivor = { ...a, gersIds: [a.gersId] };

    for (let j = i + 1; j < places.length; j += 1) {
      if (used.has(j)) continue;
      const b = places[j];
      const dist = metersBetween(a.location, b.location);

      if (
        a.name &&
        b.name &&
        a.name.toLowerCase() === b.name.toLowerCase() &&
        dist <= 75
      ) {
        used.add(j);
        survivor.gersIds.push(b.gersId);
        if ((b.confidence || 0) > (survivor.confidence || 0)) {
          survivor = {
            ...b,
            gersIds: survivor.gersIds,
          };
        }
        merges.push({ keptGersId: survivor.gersId, mergedGersId: b.gersId });
      } else if (dist <= 25 && a.name?.toLowerCase() !== b.name?.toLowerCase()) {
        suspects.push({
          placeGersId: a.gersId,
          otherGersId: b.gersId,
          distanceM: dist,
          reason: "different_names_within_25m",
        });
      }
    }

    kept.push(survivor);
    used.add(i);
  }

  return { kept, merges, suspects };
}

module.exports = {
  dedupeBatch,
  metersBetween,
};
