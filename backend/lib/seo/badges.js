/**
 * Badge embed snippets + verification page payload.
 * Spec gate: at least one category must have 5+ scored entries before badges
 * are considered "live" site-wide; individual badges also require score >= 76.
 */

const FoodItem = require("../../models/FoodItem");

const HERO_FLOOR = 76;
const CATEGORY_LIVE_THRESHOLD = 5;

function isBadgeEligible(score) {
  return Number(score || 0) >= HERO_FLOOR;
}

/** True once any food category/type pair has 5+ scored food items. */
async function isBadgeProgramLive() {
  const rows = await FoodItem.aggregate([
    {
      $match: {
        $or: [
          { adminScore: { $gt: 0 } },
          { communityScore: { $gt: 0 } },
          { overallAverageScore: { $gt: 0 } },
        ],
      },
    },
    {
      $group: {
        _id: { category: "$category", type: "$type" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: CATEGORY_LIVE_THRESHOLD } } },
    { $limit: 1 },
  ]);
  return rows.length > 0;
}

function buildEmbedSnippet(restaurant) {
  const slug = restaurant.slug || restaurant._id;
  const name = restaurant.name || "Restaurant";
  const verifyUrl = `https://bestfoodapp.com/badge/${slug}`;
  return `<a href="${verifyUrl}" rel="noopener" target="_blank" title="${escapeAttr(
    name
  )} on Best Food App">${escapeHtml(name)} — scored on Best Food App</a>`;
}

function verificationPayload({ restaurant, score, scoredAt, methodologyUrl }) {
  return {
    restaurantName: restaurant?.name,
    score: Math.round(score || 0),
    scoredAt: scoredAt || null,
    methodologyUrl:
      methodologyUrl || "https://bestfoodapp.com/scoring-criteria",
    verifyUrl: `https://bestfoodapp.com/badge/${
      restaurant?.slug || restaurant?._id
    }`,
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

module.exports = {
  HERO_FLOOR,
  CATEGORY_LIVE_THRESHOLD,
  isBadgeEligible,
  isBadgeProgramLive,
  buildEmbedSnippet,
  verificationPayload,
};
