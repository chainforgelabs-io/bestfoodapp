/**
 * Mirror of frontend/src/utils/standardizedOptions.js FOOD_CATEGORIES / FOOD_TYPES.
 * Kept in sync for Grok prompts and server-side validation of menu imports.
 */

const FOOD_CATEGORIES = [
  "Appetizers & Starters",
  "Soups & Salads",
  "Handhelds",
  "Mains / Entrées",
  "Pizza & Flatbreads",
  "Pasta",
  "Pastries & Baked Goods",
  "Sides",
  "Desserts",
  "Drinks (Non-Alcoholic)",
  "Drinks (Alcoholic)",
  "Breakfast & Brunch",
];

const FOOD_TYPES = {
  "Appetizers & Starters": [
    "Wings",
    "Nachos",
    "Calamari",
    "Bruschetta",
    "Mozzarella Sticks",
    "Spinach Dip",
    "Sliders",
    "Quesadillas",
    "Stuffed Mushrooms",
    "Shrimp Cocktail",
    "Tempura",
    "Bread",
    "Rolls",
    "Wontons",
    "Dumplings",
    "Hummus",
    "Baba Ghanoush",
    "Dolma (Stuffed Grape Leaves)",
    "Samosa",
    "Add +",
  ],
  "Soups & Salads": [
    "Caesar Salad",
    "House Salad",
    "Greek Salad",
    "Chicken Soup",
    "Tomato Soup",
    "Clam Chowder",
    "French Onion Soup",
    "Minestrone",
    "Cobb Salad",
    "Caprese Salad",
    "Add +",
  ],
  "Handhelds": [
    "Burger",
    "Tacos",
    "Burrito",
    "Banh Mi",
    "Hot Dog",
    "Sandwich",
    "Wrap",
    "Panini",
    "Sub",
    "Club Sandwich",
    "Grilled Cheese",
    "Gyro / Shawarma",
    "Pita Sandwich",
    "Add +",
  ],
  "Mains / Entrées": [
    "Bowl",
    "Steak",
    "Fried Rice",
    "Curry",
    "Chicken",
    "Fish & Chips",
    "Lobster",
    "Pork",
    "Lamb",
    "Salmon",
    "Ribs",
    "Noodle Dish",
    "Stir-Fry",
    "Sushi / Sashimi",
    "Teriyaki",
    "Kebab / Souvlaki",
    "Falafel Plate",
    "Fried Chicken",
    "BBQ Ribs",
    "Pulled Pork / Chicken",
    "Brisket",
    "Mac & Cheese",
    "Meatloaf",
    "Jerk Chicken / Pork",
    "Curry Goat / Chicken",
    "Oxtail",
    "Roti",
    "Tandoori",
    "Biryani",
    "Add +",
  ],
  "Pizza & Flatbreads": ["Pizza", "Flatbread", "Calzone", "Stromboli", "Add +"],
  Pasta: [
    "Spaghetti",
    "Fettuccine",
    "Penne",
    "Lasagna",
    "Ravioli",
    "Gnocchi",
    "Linguine",
    "Carbonara",
    "Alfredo",
    "Add +",
  ],
  "Pastries & Baked Goods": [
    "Doughnuts",
    "Croissants",
    "Danish",
    "Muffins",
    "Scones",
    "Bagels",
    "Cinnamon Rolls",
    "Turnovers",
    "Éclairs",
    "Cream Puffs",
    "Macarons",
    "Cookies",
    "Biscuits",
    "Add +",
  ],
  Sides: [
    "Fries",
    "Hash Browns",
    "Onion Rings",
    "Coleslaw",
    "Garlic Bread",
    "Rice",
    "Mashed Potatoes",
    "Steamed Vegetables",
    "Mac & Cheese",
    "Naan",
    "Add +",
  ],
  Desserts: [
    "Churro",
    "Cake",
    "Ice Cream",
    "Cheesecake",
    "Tiramisu",
    "Brownie",
    "Pie",
    "Tart",
    "Crème Brûlée",
    "Add +",
  ],
  "Drinks (Non-Alcoholic)": [
    "Soda",
    "Juice",
    "Coffee",
    "Tea",
    "Smoothie",
    "Milkshake",
    "Lemonade",
    "Water",
    "Add +",
  ],
  "Drinks (Alcoholic)": [
    "Beer",
    "Wine",
    "Cocktail",
    "Caesar",
    "Whiskey",
    "Vodka",
    "Rum",
    "Tequila",
    "Margarita",
    "Add +",
  ],
  "Breakfast & Brunch": [
    "Pancakes",
    "Waffles",
    "French Toast",
    "Eggs Benedict",
    "Omelet",
    "Breakfast Burrito",
    "Bagel",
    "Avocado Toast",
    "Add +",
  ],
};

const SIZE_OPTIONS = ["", "small", "medium", "large", "extra large"];

function taxonomyPromptBlock() {
  const lines = FOOD_CATEGORIES.map((cat) => {
    const types = (FOOD_TYPES[cat] || []).filter((t) => t !== "Add +");
    return `- ${cat}: ${types.join(", ")} (or "Add +" if none fit)`;
  });
  return lines.join("\n");
}

function coerceMenuItem(raw) {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name || "").trim();
  if (!name || name.length < 2) return null;

  // Skip obvious section headers / non-items
  const lower = name.toLowerCase();
  if (
    /^(appetizers?|starters?|mains?|entrees?|entrées?|sides?|desserts?|drinks?|beverages?|specials?|kids? menu)$/i.test(
      name
    )
  ) {
    return null;
  }

  let category = String(raw.category || "").trim();
  if (!FOOD_CATEGORIES.includes(category)) {
    const match = FOOD_CATEGORIES.find(
      (c) => c.toLowerCase() === category.toLowerCase()
    );
    category = match || "Mains / Entrées";
  }

  let type = String(raw.type || "").trim();
  const allowedTypes = FOOD_TYPES[category] || [];
  if (!allowedTypes.includes(type)) {
    const typeMatch = allowedTypes.find(
      (t) => t.toLowerCase() === type.toLowerCase()
    );
    type = typeMatch || "Add +";
  }

  let price;
  if (raw.price != null && raw.price !== "") {
    const n = Number(String(raw.price).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n >= 0) price = Math.round(n * 100) / 100;
  }

  let sizeOptions = "";
  if (raw.sizeOptions != null) {
    const s = String(raw.sizeOptions).trim().toLowerCase();
    if (SIZE_OPTIONS.includes(s)) sizeOptions = s;
  }

  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
    : [];

  const subType = raw.subType ? String(raw.subType).trim().slice(0, 80) : "";

  const sourceImageKeys = Array.isArray(raw.sourceImageKeys)
    ? raw.sourceImageKeys.map(String)
    : raw.sourceImageKey
      ? [String(raw.sourceImageKey)]
      : [];

  return {
    name: name.slice(0, 120),
    category,
    type,
    subType: subType || undefined,
    price,
    sizeOptions,
    tags,
    sourceImageKeys,
  };
}

function validateProposed(proposed) {
  if (!proposed || typeof proposed !== "object") {
    return { ok: false, message: "proposed fields required" };
  }
  const name = String(proposed.name || "").trim();
  if (!name) return { ok: false, message: "name is required" };

  const category = String(proposed.category || "").trim();
  if (!FOOD_CATEGORIES.includes(category)) {
    return { ok: false, message: "invalid category" };
  }

  const type = String(proposed.type || "").trim();
  const allowed = FOOD_TYPES[category] || [];
  if (!allowed.includes(type)) {
    return { ok: false, message: "invalid type for category" };
  }

  let price;
  if (proposed.price != null && proposed.price !== "") {
    const n = Number(proposed.price);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, message: "invalid price" };
    }
    price = Math.round(n * 100) / 100;
  }

  let sizeOptions = "";
  if (proposed.sizeOptions != null) {
    const s = String(proposed.sizeOptions);
    if (!SIZE_OPTIONS.includes(s)) {
      return { ok: false, message: "invalid sizeOptions" };
    }
    sizeOptions = s;
  }

  return {
    ok: true,
    value: {
      name: name.slice(0, 120),
      category,
      type,
      subType: proposed.subType
        ? String(proposed.subType).trim().slice(0, 80)
        : undefined,
      price,
      sizeOptions,
      tags: Array.isArray(proposed.tags)
        ? proposed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
        : [],
    },
  };
}

module.exports = {
  FOOD_CATEGORIES,
  FOOD_TYPES,
  SIZE_OPTIONS,
  taxonomyPromptBlock,
  coerceMenuItem,
  validateProposed,
};
