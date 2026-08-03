/**
 * Internal link suggestions on publish — never inject into review prose.
 */

const Review = require("../../models/Review");
const FoodItem = require("../../models/FoodItem");

async function suggestRelatedReviews(review) {
  if (!review?.foodItem || !review?._id) return [];

  const foodItem = await FoodItem.findById(review.foodItem)
    .select("category type")
    .lean();
  if (!foodItem) return [];

  const peers = await FoodItem.find({
    category: foodItem.category,
    type: foodItem.type,
  })
    .select("_id")
    .lean();
  const peerIds = peers.map((p) => p._id);

  const sameCategory = await Review.find({
    _id: { $ne: review._id },
    foodItem: { $in: peerIds },
    publishedAt: { $ne: null },
  })
    .select("_id score")
    .lean();

  if (sameCategory.length === 0) return [];

  const score = Number(review.score || 0);
  const sorted = sameCategory
    .map((r) => ({
      id: r._id,
      dist: Math.abs(Number(r.score || 0) - score),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2)
    .map((r) => r.id);

  return sorted;
}

module.exports = {
  suggestRelatedReviews,
};
