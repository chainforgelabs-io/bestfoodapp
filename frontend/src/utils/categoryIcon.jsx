import {
  Hamburger,
  Pizza,
  Fish,
  Drumstick,
  Beef,
  Soup,
  CakeSlice,
  Coffee,
  Croissant,
  ChefHat,
  UtensilsCrossed,
} from "lucide-react";

// Single source of truth: category identifier -> lucide icon.
// Keys are normalized (trimmed + lowercased) and match the category values the
// data actually uses (e.g. "Burger", "Churro", "American").
// Categories with no good lucide match (tacos, burritos, hot dogs, fries, etc.)
// intentionally fall through to the neutral UtensilsCrossed default below.
const CATEGORY_ICONS = {
  burger: Hamburger,
  burgers: Hamburger,
  pizza: Pizza,
  sushi: Fish,
  "sushi / sashimi": Fish,
  wings: Drumstick,
  brisket: Beef,
  noodles: Soup,
  desserts: CakeSlice,
  churro: CakeSlice, // the "Best Desserts" board is keyed by "Churro" in the data
  coffee: Coffee,
  bakery: Croissant,
  // Cuisine categories -> a single neutral "cuisine" mark (NOT flags):
  american: ChefHat,
  italian: ChefHat,
  vietnamese: ChefHat,
  mexican: ChefHat,
  asian: ChefHat,
  "breakfast food": ChefHat,
};

const normalize = (s) => (s || "").trim().toLowerCase();

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[normalize(category)] || UtensilsCrossed;
}
