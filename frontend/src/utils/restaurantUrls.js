/**
 * Canonical public path for a restaurant: prefer immutable slug over ObjectId.
 * @param {{ slug?: string, _id?: string } | string | null | undefined} restaurant
 */
export function restaurantPath(restaurant) {
  if (!restaurant) return "/";
  if (typeof restaurant === "string") return `/restaurant/${restaurant}`;
  const key = restaurant.slug || restaurant._id;
  return key ? `/restaurant/${key}` : "/";
}

/**
 * Key usable in /restaurant/:key routes (slug preferred).
 */
export function restaurantKey(restaurant) {
  if (!restaurant) return null;
  if (typeof restaurant === "string") return restaurant;
  return restaurant.slug || restaurant._id || null;
}
