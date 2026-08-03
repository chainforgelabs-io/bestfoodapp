/**
 * Name + address normalization for Overture place rows.
 * Always preserve nameRaw. Applies learned PlaceCorrection rules when provided.
 */

const LEGAL_SUFFIX_RE =
  /\b(ltd\.?|inc\.?|corp\.?|co\.?|llc\.?|limited|incorporated)\b\.?/gi;

function collapseWhitespace(str) {
  return String(str || "").replace(/\s+/g, " ").trim();
}

function stripLocalitySuffix(name, locality) {
  if (!locality) return name;
  const loc = locality.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\s*-\\s*${loc}\\s*$`, "i"),
    new RegExp(`,\\s*${loc}\\s*$`, "i"),
    new RegExp(`\\s+${loc}\\s+SK\\s*$`, "i"),
    new RegExp(`\\s+${loc}\\s*$`, "i"),
  ];
  let out = name;
  for (const re of patterns) out = out.replace(re, "");
  return collapseWhitespace(out);
}

function extractUnitLabel(name) {
  const hash = name.match(/\s*(#\s*\w+)\s*$/i);
  if (hash) {
    return {
      name: collapseWhitespace(name.replace(hash[0], "")),
      unitLabel: hash[1].replace(/\s+/g, ""),
    };
  }
  const dashUnit = name.match(/\s+-\s+([A-Za-z0-9][A-Za-z0-9\s]{0,30})$/);
  if (dashUnit && dashUnit[1].length <= 24) {
    return {
      name: collapseWhitespace(name.slice(0, dashUnit.index)),
      unitLabel: dashUnit[1].trim(),
    };
  }
  return { name, unitLabel: null };
}

function recaseIfNeeded(name) {
  if (!name) return name;
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length <= 4) return name;
  if (/[&.]/.test(name)) return name;
  if (name === name.toUpperCase() && letters.length > 4) {
    return name
      .toLowerCase()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }
  return name;
}

function detectLicenseClass(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return "cdla";
  const allOsm = sources.every(
    (s) => s && (s.dataset === "OpenStreetMap" || s.dataset === "osm")
  );
  return allOsm ? "odbl" : "cdla";
}

function applyCorrections(normalized, corrections = []) {
  let out = { ...normalized };
  for (const rule of corrections) {
    if (rule.ruleType === "name_normalize") {
      const matchName =
        rule.match?.nameNormalized || rule.match?.nameRaw || "";
      if (
        matchName &&
        (out.name === matchName ||
          out.nameRaw?.toLowerCase() === matchName.toLowerCase())
      ) {
        if (rule.action?.name) out.name = rule.action.name;
        if (rule.action?.unitLabel !== undefined) {
          out.unitLabel = rule.action.unitLabel;
        }
      }
    }
    if (rule.ruleType === "cuisine_hint") {
      if (
        rule.match?.sourceCategory &&
        out.sourceCategory === rule.match.sourceCategory
      ) {
        out.cuisineHint = rule.action?.cuisineHint || out.cuisineHint;
      }
    }
    if (rule.ruleType === "field_override" && rule.match?.gersId === out.gersId) {
      out = { ...out, ...rule.action };
    }
  }
  return out;
}

function normalizePlace(raw, { corrections = [] } = {}) {
  const nameRaw = collapseWhitespace(
    raw?.names?.primary || raw?.name || raw?.properties?.name || ""
  );
  let name = nameRaw;
  const locality =
    raw?.addresses?.[0]?.locality ||
    raw?.address?.locality ||
    raw?.properties?.addresses?.[0]?.locality ||
    "";

  name = stripLocalitySuffix(name, locality);
  name = name.replace(LEGAL_SUFFIX_RE, "").trim();
  const unit = extractUnitLabel(name);
  name = recaseIfNeeded(unit.name);

  const addr =
    raw?.addresses?.[0] ||
    raw?.address ||
    raw?.properties?.addresses?.[0] ||
    {};

  const categories =
    raw?.categories || raw?.properties?.categories || {};
  const taxonomy =
    raw?.taxonomy || raw?.properties?.taxonomy || {};
  const taxonomyHierarchy = Array.isArray(taxonomy.hierarchy)
    ? taxonomy.hierarchy
    : [];
  const sourceCategory =
    categories.primary ||
    taxonomy.primary ||
    categories.basic_category ||
    (Array.isArray(categories) ? categories[0] : null) ||
    raw?.basic_category ||
    null;

  const sources = raw?.sources || raw?.properties?.sources || [];
  const confidence =
    typeof raw?.confidence === "number"
      ? raw.confidence
      : typeof raw?.properties?.confidence === "number"
        ? raw.properties.confidence
        : null;

  const coords =
    raw?.geometry?.coordinates ||
    raw?.location?.coordinates ||
    null;

  let normalized = {
    gersId: raw?.id || raw?.gersId || raw?.properties?.id,
    name,
    nameRaw,
    unitLabel: unit.unitLabel,
    brandName: raw?.brand?.names?.primary || raw?.brand?.name || null,
    address: {
      freeform: addr.freeform || addr.street || "",
      street: addr.street || addr.freeform || "",
      locality: addr.locality || locality || "",
      region: addr.region || addr.country_region || "",
      postcode: addr.postcode || addr.postalCode || "",
      country: addr.country || "CA",
    },
    location:
      Array.isArray(coords) && coords.length >= 2
        ? { type: "Point", coordinates: [coords[0], coords[1]] }
        : null,
    website: raw?.websites?.[0] || raw?.website || null,
    phone: raw?.phones?.[0] || raw?.phone || null,
    sourceCategory,
    taxonomyHierarchy,
    cuisineHint: null,
    confidence,
    licenseClass: detectLicenseClass(sources),
    status: confidence != null && confidence < 0.5 ? "low_confidence" : "pending_review",
  };

  normalized = applyCorrections(normalized, corrections);
  return normalized;
}

/** Token-safe eat/drink check — avoids "bar" matching "..._association". */
function isEatAndDrinkCategory(sourceCategory, taxonomyHierarchy = []) {
  const hier = Array.isArray(taxonomyHierarchy) ? taxonomyHierarchy : [];
  if (hier.some((h) => String(h).toLowerCase() === "food_and_drink")) {
    return true;
  }
  if (hier.some((h) => String(h).toLowerCase() === "eat_and_drink")) {
    return true;
  }
  if (!sourceCategory) return false;
  const c = String(sourceCategory).toLowerCase();
  // Whole-token / suffix patterns only (underscore-separated Overture IDs)
  const tokens = c.split(/[^a-z0-9]+/).filter(Boolean);
  const tokenSet = new Set(tokens);
  const FOOD_TOKENS = new Set([
    "restaurant",
    "restaurants",
    "cafe",
    "coffee",
    "bar",
    "pub",
    "bakery",
    "pizza",
    "burger",
    "diner",
    "bistro",
    "brewery",
    "dessert",
    "eatery",
    "food",
    "drink",
  ]);
  if ([...tokenSet].some((t) => FOOD_TOKENS.has(t))) return true;
  return (
    c.includes("eat_and_drink") ||
    c.includes("food_and_drink") ||
    c.includes("ice_cream") ||
    c.endsWith("_restaurant") ||
    c.endsWith("_cafe") ||
    c.endsWith("_bar") ||
    c.endsWith("_pub") ||
    c.endsWith("_bakery") ||
    c.includes("fast_food") ||
    c.includes("coffee_shop") ||
    c.includes("casual_eatery")
  );
}

module.exports = {
  collapseWhitespace,
  normalizePlace,
  isEatAndDrinkCategory,
  detectLicenseClass,
  slugifyName: (n) =>
    collapseWhitespace(n)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
};
