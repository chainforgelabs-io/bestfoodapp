/**
 * Normalize place/Overture address fields to Google Places–style values
 * used by restaurant search (e.g. "Canada", "Saskatchewan").
 */

const COUNTRY_ALIASES = {
  ca: "Canada",
  can: "Canada",
  canada: "Canada",
  us: "United States",
  usa: "United States",
  "united states": "United States",
  "united states of america": "United States",
};

const PROVINCE_CODE_TO_NAME = {
  nl: "Newfoundland and Labrador",
  pe: "Prince Edward Island",
  ns: "Nova Scotia",
  nb: "New Brunswick",
  qc: "Quebec",
  on: "Ontario",
  mb: "Manitoba",
  sk: "Saskatchewan",
  ab: "Alberta",
  bc: "British Columbia",
  yt: "Yukon",
  nt: "Northwest Territories",
  nu: "Nunavut",
};

const PROVINCE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(PROVINCE_CODE_TO_NAME).map(([code, name]) => [
    name.toLowerCase(),
    code.toUpperCase(),
  ])
);

function normalizeCountry(country) {
  const raw = String(country || "").trim();
  if (!raw) return "Canada";
  const mapped = COUNTRY_ALIASES[raw.toLowerCase()];
  return mapped || raw;
}

function normalizeProvince(province) {
  const raw = String(province || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (PROVINCE_CODE_TO_NAME[lower]) {
    return PROVINCE_CODE_TO_NAME[lower];
  }
  // Already a full name (or unknown) — title-case known names if exact code miss
  if (PROVINCE_NAME_TO_CODE[lower]) {
    // Return canonical casing from CODE_TO_NAME
    const code = PROVINCE_NAME_TO_CODE[lower];
    return PROVINCE_CODE_TO_NAME[code.toLowerCase()];
  }
  return raw;
}

/**
 * @param {{ street?: string, city?: string, province?: string, country?: string, postalCode?: string }} addr
 */
function normalizeAddressFields(addr = {}) {
  return {
    street: String(addr.street || "").trim() || "Unknown",
    city: String(addr.city || "").trim() || "Unknown",
    province: normalizeProvince(addr.province),
    country: normalizeCountry(addr.country),
    postalCode: String(addr.postalCode || "").trim(),
  };
}

/** Regex alternatives for restaurant search (query may be code or full name). */
function countrySearchPattern(country) {
  const normalized = normalizeCountry(country);
  const lower = String(country || "").trim().toLowerCase();
  if (normalized === "Canada" || lower === "ca" || lower === "can") {
    return "^(Canada|CA|CAN)$";
  }
  if (
    normalized === "United States" ||
    lower === "us" ||
    lower === "usa"
  ) {
    return "^(United States|USA|US)$";
  }
  const escaped = String(country || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^${escaped}$`;
}

function provinceSearchPattern(province) {
  const raw = String(province || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const fullName = PROVINCE_CODE_TO_NAME[lower] || normalizeProvince(raw);
  const code =
    PROVINCE_NAME_TO_CODE[fullName.toLowerCase()] ||
    (PROVINCE_CODE_TO_NAME[lower] ? lower.toUpperCase() : null);
  const parts = new Set([raw, fullName]);
  if (code) parts.add(code);
  const alts = [...parts]
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return `^(${alts.join("|")})$`;
}

function mongoTrimLower(field) {
  return { $toLower: { $trim: { input: { $ifNull: [field, ""] } } } };
}

function mongoTrim(field) {
  return { $trim: { input: { $ifNull: [field, ""] } } };
}

function cityNormalizeExpr(field) {
  return mongoTrim(field);
}

function countryNormalizeExpr(field) {
  return {
    $let: {
      vars: { lower: mongoTrimLower(field), trimmed: mongoTrim(field) },
      in: {
        $switch: {
          branches: [
            {
              case: { $in: ["$$lower", ["", "ca", "can", "canada"]] },
              then: "Canada",
            },
            {
              case: {
                $in: [
                  "$$lower",
                  ["us", "usa", "united states", "united states of america"],
                ],
              },
              then: "United States",
            },
          ],
          default: "$$trimmed",
        },
      },
    },
  };
}

function provinceNormalizeExpr(field) {
  const branches = [];
  Object.entries(PROVINCE_CODE_TO_NAME).forEach(([code, name]) => {
    branches.push({ case: { $eq: ["$$lower", code] }, then: name });
    branches.push({
      case: { $eq: ["$$lower", name.toLowerCase()] },
      then: name,
    });
  });
  return {
    $let: {
      vars: { lower: mongoTrimLower(field), trimmed: mongoTrim(field) },
      in: {
        $switch: {
          branches,
          default: "$$trimmed",
        },
      },
    },
  };
}

module.exports = {
  normalizeCountry,
  normalizeProvince,
  normalizeAddressFields,
  countrySearchPattern,
  provinceSearchPattern,
  cityNormalizeExpr,
  countryNormalizeExpr,
  provinceNormalizeExpr,
  PROVINCE_CODE_TO_NAME,
};
