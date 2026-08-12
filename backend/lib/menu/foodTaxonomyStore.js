/**
 * Load / merge dynamic food taxonomy options from Mongo.
 */
const FoodTaxonomyOption = require("../../models/FoodTaxonomyOption");
const { FOOD_CATEGORIES, FOOD_TYPES } = require("./taxonomy");

function mergeUnique(base = [], extras = []) {
  const seen = new Set();
  const out = [];
  for (const v of [...base, ...extras]) {
    if (!v || v === "Add +") continue;
    const key = String(v).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(String(v));
  }
  return out;
}

function withAddPlus(list) {
  return [...mergeUnique(list, []), "Add +"];
}

async function loadDbOptions() {
  const rows = await FoodTaxonomyOption.find({}).lean();
  const categories = [];
  const types = {};
  const subtypes = {};
  for (const row of rows) {
    if (row.kind === "category") {
      categories.push(row.value);
    } else if (row.kind === "type") {
      const parent = row.parent || "";
      if (!types[parent]) types[parent] = [];
      types[parent].push(row.value);
    } else if (row.kind === "subType") {
      const parent = row.parent || "";
      if (!subtypes[parent]) subtypes[parent] = [];
      subtypes[parent].push(row.value);
    }
  }
  return { categories, types, subtypes };
}

/**
 * Returns static+DB categories/types (with Add +), and DB-only subtype extras
 * keyed by parent type. Clients merge subtypes with their local FOOD_SUBTYPES.
 */
async function getMergedTaxonomy() {
  const db = await loadDbOptions();
  const categories = mergeUnique(FOOD_CATEGORIES, db.categories);

  const types = {};
  for (const cat of categories) {
    types[cat] = withAddPlus(
      mergeUnique(FOOD_TYPES[cat] || [], db.types[cat] || [])
    );
  }
  for (const [cat, list] of Object.entries(db.types)) {
    if (!types[cat]) types[cat] = withAddPlus(list);
  }

  const subtypes = {};
  for (const [typeName, list] of Object.entries(db.subtypes)) {
    subtypes[typeName] = mergeUnique(list, []);
  }

  return { categories, types, subtypes };
}

async function isAllowedType(category, type) {
  if (!type || type === "Add +") return false;
  const staticList = FOOD_TYPES[category] || [];
  if (
    staticList.some(
      (t) => t.toLowerCase() === type.toLowerCase() && t !== "Add +"
    )
  ) {
    return true;
  }
  const found = await FoodTaxonomyOption.findOne({
    kind: "type",
    parentKey: String(category || "").toLowerCase(),
    valueKey: String(type).toLowerCase(),
  }).lean();
  return Boolean(found);
}

async function isAllowedSubType(_type, subType) {
  if (!subType) return true;
  if (subType === "Add +") return false;
  return String(subType).trim().length > 0;
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

async function createTaxonomyOption({ kind, value, parent, userId }) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    const err = new Error("value is required");
    err.code = "VALIDATION";
    throw err;
  }
  if (normalized === "Add +") {
    const err = new Error('"Add +" is not a valid option value');
    err.code = "VALIDATION";
    throw err;
  }
  if (!["category", "type", "subType"].includes(kind)) {
    const err = new Error("kind must be category, type, or subType");
    err.code = "VALIDATION";
    throw err;
  }

  let parentNorm = "";
  if (kind === "type") {
    parentNorm = normalizeValue(parent);
    if (!parentNorm) {
      const err = new Error("parent category is required for type");
      err.code = "VALIDATION";
      throw err;
    }
    const cats = mergeUnique(
      FOOD_CATEGORIES,
      (await loadDbOptions()).categories
    );
    const canonical = cats.find(
      (c) => c.toLowerCase() === parentNorm.toLowerCase()
    );
    if (!canonical) {
      const err = new Error("parent category not found");
      err.code = "VALIDATION";
      throw err;
    }
    parentNorm = canonical;

    const staticList = FOOD_TYPES[parentNorm] || [];
    const hit = staticList.find(
      (t) => t.toLowerCase() === normalized.toLowerCase() && t !== "Add +"
    );
    if (hit) {
      return { option: { kind, value: hit, parent: parentNorm }, created: false };
    }
  } else if (kind === "subType") {
    parentNorm = normalizeValue(parent);
    if (!parentNorm) {
      const err = new Error("parent type is required for subType");
      err.code = "VALIDATION";
      throw err;
    }
  } else if (kind === "category") {
    const hit = FOOD_CATEGORIES.find(
      (c) => c.toLowerCase() === normalized.toLowerCase()
    );
    if (hit) {
      return { option: { kind, value: hit, parent: "" }, created: false };
    }
  }

  const valueKey = normalized.toLowerCase();
  const parentKey = parentNorm.toLowerCase();

  try {
    const doc = await FoodTaxonomyOption.create({
      kind,
      value: normalized,
      valueKey,
      parent: parentNorm,
      parentKey,
      createdBy: userId,
    });
    return {
      option: {
        kind: doc.kind,
        value: doc.value,
        parent: doc.parent,
        _id: doc._id,
      },
      created: true,
    };
  } catch (err) {
    if (err.code === 11000) {
      const existing = await FoodTaxonomyOption.findOne({
        kind,
        parentKey,
        valueKey,
      }).lean();
      return {
        option: {
          kind,
          value: existing?.value || normalized,
          parent: existing?.parent || parentNorm,
          _id: existing?._id,
        },
        created: false,
      };
    }
    throw err;
  }
}

module.exports = {
  getMergedTaxonomy,
  isAllowedType,
  isAllowedSubType,
  createTaxonomyOption,
  mergeUnique,
  withAddPlus,
};
