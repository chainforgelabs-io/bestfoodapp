// Helpers for matching OCR'd receipt data against existing records so the
// review wizard can either auto-select an existing entry or pre-fill the
// "add new" form. Matching is intentionally conservative: we only auto-select
// on a confident match, otherwise we treat the receipt value as a suggestion.

import { FOOD_TYPES, FOOD_SUBTYPES } from "./standardizedOptions";

/** Lowercase, strip punctuation/extra whitespace for comparison. */
export function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeName(value).split(" ").filter(Boolean);
}

// Jaccard-style token overlap, 0..1.
function tokenSimilarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / new Set([...ta, ...tb]).size;
}

/**
 * Score how well two names match, 0..1.
 * Exact normalized equality = 1, substring containment is strong, otherwise
 * fall back to token overlap.
 */
export function nameMatchScore(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  return tokenSimilarity(a, b);
}

/**
 * Find the best matching restaurant for an OCR'd vendor name.
 * @returns {{ restaurant: object, score: number } | null}
 */
export function matchRestaurant(vendorName, restaurants = [], threshold = 0.6) {
  if (!vendorName || !restaurants.length) return null;
  let best = null;
  for (const restaurant of restaurants) {
    const score = nameMatchScore(vendorName, restaurant.name);
    if (!best || score > best.score) best = { restaurant, score };
  }
  return best && best.score >= threshold ? best : null;
}

/**
 * Find the best matching existing food item for an OCR'd line-item name.
 * @returns {{ item: object, score: number } | null}
 */
export function matchFoodItem(lineItemName, items = [], threshold = 0.6) {
  if (!lineItemName || !items.length) return null;
  let best = null;
  for (const item of items) {
    const score = nameMatchScore(lineItemName, item.name);
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= threshold ? best : null;
}

// Strip a trailing "s" so plural receipt items match singular taxonomy entries
// (e.g. "taco" matches the "Tacos" type).
function singularize(token) {
  return token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token;
}

function singularTokens(value) {
  return tokenize(value)
    .map(singularize)
    .filter((t) => t.length > 1);
}

// Pre-built index of every category/type pair from the standardized options.
const TYPE_INDEX = (() => {
  const entries = [];
  for (const [category, types] of Object.entries(FOOD_TYPES)) {
    for (const type of types) {
      if (type === "Add +") continue;
      entries.push({ category, type, tokens: singularTokens(type) });
    }
  }
  return entries;
})();

/**
 * Best-effort guess of a food item's category/type/sub-type from its name,
 * using the app's standardized taxonomy. Returns nulls when nothing matches,
 * so the user always confirms — we never guess blindly.
 * @returns {{ category: string, type: string, subType: string }}
 */
export function guessFoodClassification(name) {
  const empty = { category: "", type: "", subType: "" };
  const nameTokens = new Set(singularTokens(name));
  if (nameTokens.size === 0) return empty;

  // Find the type whose tokens overlap the item name the most.
  let best = null;
  for (const entry of TYPE_INDEX) {
    if (entry.tokens.length === 0) continue;
    const overlap = entry.tokens.filter((t) => nameTokens.has(t)).length;
    if (overlap === 0) continue;
    // Prefer more overlapping tokens, then more specific (longer) type names.
    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && entry.tokens.length > best.tokens.length)
    ) {
      best = { ...entry, overlap };
    }
  }
  if (!best) return empty;

  // Try to narrow down a sub-type within the matched type.
  let subType = "";
  for (const option of FOOD_SUBTYPES[best.type] || []) {
    if (option === "Add +") continue;
    const optionTokens = singularTokens(option);
    if (optionTokens.length === 0) continue;
    if (optionTokens.some((t) => nameTokens.has(t))) {
      subType = option;
      break;
    }
  }

  return { category: best.category, type: best.type, subType };
}

/**
 * Split parsed receipt line items into ones that match existing food items
 * (auto-addable) and ones with no good match (suggested new items).
 */
export function partitionLineItems(lineItems = [], existingItems = []) {
  const matched = [];
  const unmatched = [];
  for (const li of lineItems) {
    const result = matchFoodItem(li.name, existingItems);
    if (result) {
      matched.push({ lineItem: li, item: result.item, score: result.score });
    } else {
      unmatched.push(li);
    }
  }
  return { matched, unmatched };
}
