/**
 * Canonical type slugs for “best {dish|cuisine}” URLs.
 * Keep in sync with backend/lib/seo/rankingSlugs.js
 */

export const MIN_TYPED_BOARD = 7;

export const SLUG_BOARDS = {
  burgers: { kind: "food", value: "Burger", title: "burgers" },
  pizza: { kind: "food", value: "Pizza", title: "pizza" },
  tacos: { kind: "food", value: "Tacos", title: "tacos" },
  burritos: { kind: "food", value: "Burrito", title: "burritos" },
  "hot-dogs": { kind: "food", value: "Hot Dog", title: "hot dogs" },
  fries: { kind: "food", value: "Fries", title: "fries" },
  desserts: {
    kind: "food",
    value: "Desserts",
    title: "desserts",
    matchField: "category",
  },
  italian: { kind: "cuisine", value: "Italian", title: "Italian" },
  american: { kind: "cuisine", value: "American", title: "American" },
  vietnamese: { kind: "cuisine", value: "Vietnamese", title: "Vietnamese" },
  mexican: { kind: "cuisine", value: "Mexican", title: "Mexican" },
  breakfast: { kind: "cuisine", value: "Breakfast", title: "breakfast" },
  asian: { kind: "cuisine", value: "Asian", title: "Asian" },
};

export function kebabSlug(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCaseFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function resolveTypeSlug(slug) {
  const key = kebabSlug(slug);
  if (!key) return null;
  if (SLUG_BOARDS[key]) {
    return { slug: key, ...SLUG_BOARDS[key] };
  }
  return {
    slug: key,
    kind: "food",
    value: titleCaseFromSlug(key),
    title: key.replace(/-/g, " "),
    matchField: "type",
  };
}

export function headingForBoard(board, cityName) {
  const label = board?.title || board?.value || "food";
  if (cityName) return `Best ${label} in ${cityName}`;
  return `Best ${label}`;
}

export function slugForValue(value, kind = "food") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const found = Object.entries(SLUG_BOARDS).find(
    ([, board]) =>
      board.kind === kind && board.value.toLowerCase() === raw.toLowerCase()
  );
  if (found) return found[0];
  return kebabSlug(raw);
}
