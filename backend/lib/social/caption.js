const SUPPORTED_PLACEHOLDERS = [
  "itemName",
  "restaurantName",
  "score",
  "date",
  "city",
];

function validateCaptionTemplate(template) {
  if (typeof template !== "string" || !template.trim()) {
    return { valid: false, error: "captionTemplate must be a non-empty string" };
  }
  const matches = template.match(/\{(\w+)\}/g) || [];
  for (const token of matches) {
    const key = token.slice(1, -1);
    if (!SUPPORTED_PLACEHOLDERS.includes(key)) {
      return {
        valid: false,
        error: `Unsupported placeholder: {${key}}`,
      };
    }
  }
  return { valid: true };
}

function formatReviewDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderCaption(template, review, foodItem, restaurant) {
  const values = {
    itemName: foodItem?.name || "Unknown item",
    restaurantName: restaurant?.name || "Unknown restaurant",
    score: String(Math.round(review?.score ?? 0)),
    date: formatReviewDate(review?.reviewDate || review?.purchaseDate),
    city: restaurant?.address?.city || "",
  };

  return template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? values[key] : `{${key}}`
  );
}

module.exports = {
  SUPPORTED_PLACEHOLDERS,
  validateCaptionTemplate,
  renderCaption,
  formatReviewDate,
};
