/**
 * Map Overture place categories → Best Food App RESTAURANT_TYPES + CUISINE_TYPES.
 * Unmapped / ambiguous → safe defaults (no silent wrong cuisine guesses).
 */

const RESTAURANT_TYPES = new Set([
  "Fast Food",
  "Fast Casual",
  "Casual Dining",
  "Fine Dining",
  "Cafe / Coffee Shop",
  "Bar / Pub / Tavern",
  "Gastropub",
  "Sandwich Shop / Deli",
  "Food Truck / Cart",
  "Buffet",
  "Diner",
  "Bakery",
]);

const CUISINE_TYPES = new Set([
  "American",
  "Canadian",
  "BBQ",
  "Breakfast",
  "Cajun & Creole",
  "Caribbean",
  "Latin American",
  "Mexican",
  "South American",
  "British",
  "Eastern European",
  "French",
  "German",
  "Greek",
  "Italian",
  "Mediterranean",
  "Portuguese",
  "Spanish",
  "Asian",
  "Chinese",
  "Filipino",
  "Indian",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",
  "African",
  "Middle Eastern",
  "Turkish",
  "Bakery / Pastry",
  "Fusion",
  "Gastropub",
  "Seafood",
  "Steakhouse",
  "Vegan / Vegetarian",
]);

const DEFAULT_TYPE = "Casual Dining";
const DEFAULT_CUISINE = "Other";

/** Exact / primary Overture category → { type, cuisine } */
const PRIMARY_MAP = {
  // Types (venue style)
  restaurant: { type: "Casual Dining" },
  fast_food_restaurant: { type: "Fast Food" },
  fast_food: { type: "Fast Food" },
  cafe: { type: "Cafe / Coffee Shop", cuisine: "Breakfast" },
  coffee_shop: { type: "Cafe / Coffee Shop", cuisine: "Breakfast" },
  tea_room: { type: "Cafe / Coffee Shop" },
  bakery: { type: "Bakery", cuisine: "Bakery / Pastry" },
  pastry_shop: { type: "Bakery", cuisine: "Bakery / Pastry" },
  bar: { type: "Bar / Pub / Tavern" },
  pub: { type: "Bar / Pub / Tavern" },
  sports_bar: { type: "Bar / Pub / Tavern" },
  cocktail_bar: { type: "Bar / Pub / Tavern" },
  wine_bar: { type: "Bar / Pub / Tavern" },
  brewery: { type: "Bar / Pub / Tavern" },
  brewpub: { type: "Gastropub", cuisine: "Gastropub" },
  gastropub: { type: "Gastropub", cuisine: "Gastropub" },
  diner: { type: "Diner", cuisine: "American" },
  buffet_restaurant: { type: "Buffet" },
  food_truck: { type: "Food Truck / Cart" },
  sandwich_shop: { type: "Sandwich Shop / Deli" },
  deli: { type: "Sandwich Shop / Deli" },
  fine_dining_restaurant: { type: "Fine Dining" },
  casual_eatery: { type: "Casual Dining" },
  lounge: { type: "Bar / Pub / Tavern" },
  juice_bar: { type: "Cafe / Coffee Shop" },
  smoothie_juice_bar: { type: "Cafe / Coffee Shop" },
  ice_cream_shop: { type: "Cafe / Coffee Shop", cuisine: "Bakery / Pastry" },
  dessert_shop: { type: "Cafe / Coffee Shop", cuisine: "Bakery / Pastry" },
  pizza_restaurant: { type: "Casual Dining", cuisine: "Italian" },
  pizza: { type: "Casual Dining", cuisine: "Italian" },
  steak_house: { type: "Fine Dining", cuisine: "Steakhouse" },
  steakhouse: { type: "Fine Dining", cuisine: "Steakhouse" },
  seafood_restaurant: { type: "Casual Dining", cuisine: "Seafood" },
  barbecue_restaurant: { type: "Casual Dining", cuisine: "BBQ" },
  breakfast_restaurant: { type: "Casual Dining", cuisine: "Breakfast" },
  brunch_restaurant: { type: "Casual Dining", cuisine: "Breakfast" },
  vegan_restaurant: { type: "Casual Dining", cuisine: "Vegan / Vegetarian" },
  vegetarian_restaurant: {
    type: "Casual Dining",
    cuisine: "Vegan / Vegetarian",
  },
  hamburger_restaurant: { type: "Fast Casual", cuisine: "American" },
  burger_restaurant: { type: "Fast Casual", cuisine: "American" },
  chicken_restaurant: { type: "Fast Casual", cuisine: "American" },
  sandwich_restaurant: { type: "Sandwich Shop / Deli" },
  noodle_restaurant: { type: "Casual Dining", cuisine: "Asian" },
  sushi_restaurant: { type: "Casual Dining", cuisine: "Japanese" },
  ramen_restaurant: { type: "Casual Dining", cuisine: "Japanese" },
  chinese_restaurant: { type: "Casual Dining", cuisine: "Chinese" },
  japanese_restaurant: { type: "Casual Dining", cuisine: "Japanese" },
  korean_restaurant: { type: "Casual Dining", cuisine: "Korean" },
  thai_restaurant: { type: "Casual Dining", cuisine: "Thai" },
  vietnamese_restaurant: { type: "Casual Dining", cuisine: "Vietnamese" },
  indian_restaurant: { type: "Casual Dining", cuisine: "Indian" },
  filipino_restaurant: { type: "Casual Dining", cuisine: "Filipino" },
  asian_restaurant: { type: "Casual Dining", cuisine: "Asian" },
  mexican_restaurant: { type: "Casual Dining", cuisine: "Mexican" },
  latin_american_restaurant: {
    type: "Casual Dining",
    cuisine: "Latin American",
  },
  south_american_restaurant: {
    type: "Casual Dining",
    cuisine: "South American",
  },
  american_restaurant: { type: "Casual Dining", cuisine: "American" },
  canadian_restaurant: { type: "Casual Dining", cuisine: "Canadian" },
  italian_restaurant: { type: "Casual Dining", cuisine: "Italian" },
  french_restaurant: { type: "Casual Dining", cuisine: "French" },
  greek_restaurant: { type: "Casual Dining", cuisine: "Greek" },
  mediterranean_restaurant: {
    type: "Casual Dining",
    cuisine: "Mediterranean",
  },
  spanish_restaurant: { type: "Casual Dining", cuisine: "Spanish" },
  portuguese_restaurant: { type: "Casual Dining", cuisine: "Portuguese" },
  german_restaurant: { type: "Casual Dining", cuisine: "German" },
  british_restaurant: { type: "Casual Dining", cuisine: "British" },
  eastern_european_restaurant: {
    type: "Casual Dining",
    cuisine: "Eastern European",
  },
  middle_eastern_restaurant: {
    type: "Casual Dining",
    cuisine: "Middle Eastern",
  },
  turkish_restaurant: { type: "Casual Dining", cuisine: "Turkish" },
  african_restaurant: { type: "Casual Dining", cuisine: "African" },
  caribbean_restaurant: { type: "Casual Dining", cuisine: "Caribbean" },
  cajun_restaurant: { type: "Casual Dining", cuisine: "Cajun & Creole" },
  creole_restaurant: { type: "Casual Dining", cuisine: "Cajun & Creole" },
  fusion_restaurant: { type: "Casual Dining", cuisine: "Fusion" },
  bar_and_grill_restaurant: { type: "Bar / Pub / Tavern", cuisine: "American" },
  european_restaurant: { type: "Casual Dining", cuisine: "Mediterranean" },
  north_american_restaurant: { type: "Casual Dining", cuisine: "American" },
};

/** Substring / token hints when primary is unknown */
const TOKEN_CUISINE = [
  [/\b(sushi|ramen|japanese)\b/, "Japanese"],
  [/\b(chinese|dim_?sum|szechuan|cantonese)\b/, "Chinese"],
  [/\b(korean)\b/, "Korean"],
  [/\b(thai)\b/, "Thai"],
  [/\b(viet|vietnamese|pho)\b/, "Vietnamese"],
  [/\b(indian|tandoor|curry)\b/, "Indian"],
  [/\b(filipino)\b/, "Filipino"],
  [/\b(mexican|taco|burrito)\b/, "Mexican"],
  [/\b(italian|pizza|pasta|trattoria)\b/, "Italian"],
  [/\b(french|bistro|crepe)\b/, "French"],
  [/\b(greek|gyro)\b/, "Greek"],
  [/\b(mediterranean|falafel|hummus)\b/, "Mediterranean"],
  [/\b(spanish|tapas)\b/, "Spanish"],
  [/\b(portuguese)\b/, "Portuguese"],
  [/\b(german|schnitzel)\b/, "German"],
  [/\b(british)\b/, "British"],
  [/\b(turkish|doner|kebab)\b/, "Turkish"],
  [/\b(middle_?east|lebanese|persian)\b/, "Middle Eastern"],
  [/\b(african|ethiopian)\b/, "African"],
  [/\b(caribbean|jamaican)\b/, "Caribbean"],
  [/\b(cajun|creole)\b/, "Cajun & Creole"],
  [/\b(bbq|barbecue|smokehouse)\b/, "BBQ"],
  [/\b(seafood|oyster)\b/, "Seafood"],
  [/\b(steak|steakhouse|steak_house)\b/, "Steakhouse"],
  [/\b(vegan|vegetarian|plant_?based)\b/, "Vegan / Vegetarian"],
  [/\b(bakery|pastry|donut|doughnut)\b/, "Bakery / Pastry"],
  [/\b(breakfast|brunch|pancake)\b/, "Breakfast"],
  [/\b(burger|american|diner)\b/, "American"],
  [/\b(asian|noodle)\b/, "Asian"],
  [/\b(latin|brazilian|peruvian|argentin)\b/, "Latin American"],
  [/\b(fusion)\b/, "Fusion"],
];

const TOKEN_TYPE = [
  [/\b(fast_?food|drive_?thru)\b/, "Fast Food"],
  [/\b(coffee|cafe|tea_?room|espresso)\b/, "Cafe / Coffee Shop"],
  [/\b(bakery|pastry)\b/, "Bakery"],
  [/\b(gastropub)\b/, "Gastropub"],
  [/\b(bar|pub|tavern|brewery|lounge|nightlife)\b/, "Bar / Pub / Tavern"],
  [/\b(diner)\b/, "Diner"],
  [/\b(buffet)\b/, "Buffet"],
  [/\b(food_?truck|cart)\b/, "Food Truck / Cart"],
  [/\b(sandwich|deli|sub_?shop)\b/, "Sandwich Shop / Deli"],
  [/\b(fine_?dining|steak_?house|steakhouse)\b/, "Fine Dining"],
  [/\b(fast_?casual)\b/, "Fast Casual"],
];

function normalizeKey(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/** Underscore-aware word boundary test against a normalized category blob. */
function testToken(re, blob) {
  // Turn underscores into spaces so \b works on tokens like pizza_restaurant
  const spaced = ` ${String(blob).replace(/_/g, " ")} `;
  return re.test(spaced);
}

function isAllowedCuisine(c) {
  return CUISINE_TYPES.has(c);
}

function isAllowedType(t) {
  return RESTAURANT_TYPES.has(t);
}

/**
 * @param {{ sourceCategory?: string, cuisineHint?: string, taxonomyHierarchy?: string[] }} placeLike
 * @returns {{ type: string, cuisine: string, mapped: boolean }}
 */
function mapOvertureCategory(placeLike = {}) {
  const hint = placeLike.cuisineHint;
  // If admin already set a cuisine that matches our schema, keep it
  if (hint && isAllowedCuisine(hint)) {
    const typeFromCat = mapFromKeys([placeLike.sourceCategory]).type;
    return {
      type: typeFromCat || DEFAULT_TYPE,
      cuisine: hint,
      mapped: true,
    };
  }

  const keys = [
    placeLike.sourceCategory,
    hint,
    ...(Array.isArray(placeLike.taxonomyHierarchy)
      ? [...placeLike.taxonomyHierarchy].reverse()
      : []),
  ].filter(Boolean);

  const mapped = mapFromKeys(keys);
  return {
    type: mapped.type || DEFAULT_TYPE,
    cuisine: mapped.cuisine || DEFAULT_CUISINE,
    mapped: Boolean(mapped.type || mapped.cuisine),
  };
}

function mapFromKeys(keys) {
  let type = null;
  let cuisine = null;

  for (const key of keys) {
    const n = normalizeKey(key);
    const hit = PRIMARY_MAP[n];
    if (hit) {
      if (hit.type && !type) type = hit.type;
      if (hit.cuisine && !cuisine) cuisine = hit.cuisine;
    }
  }

  const blob = keys.map(normalizeKey).join(" ");
  if (!cuisine) {
    for (const [re, c] of TOKEN_CUISINE) {
      if (testToken(re, blob)) {
        cuisine = c;
        break;
      }
    }
  }
  if (!type) {
    for (const [re, t] of TOKEN_TYPE) {
      if (testToken(re, blob)) {
        type = t;
        break;
      }
    }
  }

  if (type && !isAllowedType(type)) type = DEFAULT_TYPE;
  if (cuisine && !isAllowedCuisine(cuisine) && cuisine !== DEFAULT_CUISINE) {
    cuisine = DEFAULT_CUISINE;
  }

  return { type, cuisine };
}

module.exports = {
  mapOvertureCategory,
  DEFAULT_TYPE,
  DEFAULT_CUISINE,
  RESTAURANT_TYPES: [...RESTAURANT_TYPES],
  CUISINE_TYPES: [...CUISINE_TYPES],
};
