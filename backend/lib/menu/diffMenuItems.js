/**
 * Diff extracted menu items against existing FoodItems for a restaurant.
 */

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function snapshotFoodItem(item) {
  return {
    name: item.name,
    category: item.category,
    type: item.type,
    subType: item.subType || "",
    price: item.price,
    sizeOptions: item.sizeOptions || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
  };
}

function pricesDiffer(a, b) {
  const na = a == null || a === "" ? null : Number(a);
  const nb = b == null || b === "" ? null : Number(b);
  if (na == null && nb == null) return false;
  if (na == null || nb == null) return true;
  return Math.abs(na - nb) >= 0.01;
}

function fieldsDiffer(proposed, existing) {
  if (normalizeName(proposed.name) !== normalizeName(existing.name)) return true;
  if (proposed.category !== existing.category) return true;
  if (proposed.type !== existing.type) return true;
  if ((proposed.subType || "") !== (existing.subType || "")) return true;
  if ((proposed.sizeOptions || "") !== (existing.sizeOptions || "")) return true;
  if (pricesDiffer(proposed.price, existing.price)) return true;
  return false;
}

/**
 * @param {Array} extracted - coerced menu items from AI
 * @param {Array} existingItems - FoodItem docs for the restaurant
 * @param {number} fuzzyThreshold - default 0.9
 * @returns {{ adds: Array, updates: Array, unchanged: number }}
 */
function diffMenuItems(extracted, existingItems, fuzzyThreshold = 0.9) {
  const pool = (existingItems || []).map((item) => ({
    item,
    norm: normalizeName(item.name),
    used: false,
  }));

  const adds = [];
  const updates = [];
  let unchanged = 0;

  for (const proposed of extracted || []) {
    const norm = normalizeName(proposed.name);
    if (!norm) continue;

    let best = null;
    let bestScore = 0;

    for (const entry of pool) {
      if (entry.used) continue;
      if (entry.norm === norm) {
        best = entry;
        bestScore = 1;
        break;
      }
      const score = similarity(norm, entry.norm);
      if (score >= fuzzyThreshold && score > bestScore) {
        best = entry;
        bestScore = score;
      }
    }

    if (!best) {
      adds.push({ proposed, sourceImageKeys: proposed.sourceImageKeys || [] });
      continue;
    }

    best.used = true;
    const existing = snapshotFoodItem(best.item);
    if (!fieldsDiffer(proposed, existing)) {
      unchanged += 1;
      continue;
    }

    updates.push({
      proposed,
      matchedFoodItem: best.item._id,
      existing,
      sourceImageKeys: proposed.sourceImageKeys || [],
    });
  }

  return { adds, updates, unchanged };
}

module.exports = {
  normalizeName,
  similarity,
  snapshotFoodItem,
  fieldsDiffer,
  pricesDiffer,
  diffMenuItems,
};
