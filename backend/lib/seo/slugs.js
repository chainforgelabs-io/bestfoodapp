/**
 * Slug generation, collision handling, and immutability guards.
 */

function slugify(input) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

/**
 * Allocate a unique slug on a model that has a `slug` field.
 * Appends -2, -3 on collision. Never overwrites a locked slug.
 */
async function allocateSlug(Model, baseName, { excludeId = null } = {}) {
  const base = slugify(baseName) || "item";
  let candidate = base;
  let n = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await Model.findOne(query).select("_id slugLockedAt").lean();
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
    if (n > 500) {
      throw new Error(`slug_collision_exhausted:${base}`);
    }
  }
}

function isSlugLocked(doc) {
  return Boolean(doc?.slugLockedAt);
}

module.exports = {
  slugify,
  allocateSlug,
  isSlugLocked,
};
