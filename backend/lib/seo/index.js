/**
 * SEO automation entry point. Called once when a review is published.
 * Each step is independently failable; publishing never depends on SEO success.
 */

const Review = require("../../models/Review");
const Restaurant = require("../../models/Restaurant");
const FoodItem = require("../../models/FoodItem");
const Address = require("../../models/Address");
const User = require("../../models/User");
const SeoJob = require("../../models/SeoJob");
const { allocateSlug, isSlugLocked } = require("./slugs");
const { absoluteUrl } = require("./schema");
const { suggestRelatedReviews } = require("./links");
const { generateAndUploadOg, s3Enabled } = require("./og");

async function logStep(reviewId, step, status, { error, result } = {}) {
  await SeoJob.findOneAndUpdate(
    { reviewId, step },
    {
      reviewId,
      step,
      status,
      error: error || null,
      result: result || null,
      $inc: { attempts: 1 },
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

async function stepSlugAndCanonical(review) {
  const restaurant = await Restaurant.findById(review.restaurantId);
  if (!restaurant) throw new Error("restaurant_not_found");

  if (!restaurant.slug) {
    restaurant.slug = await allocateSlug(Restaurant, restaurant.name, {
      excludeId: restaurant._id,
    });
    await restaurant.save();
  }

  if (!review.slug) {
    const foodItem = await FoodItem.findById(review.foodItem).select("name");
    const base = foodItem?.name
      ? `${foodItem.name}-${restaurant.name}`
      : restaurant.name;
    review.slug = await allocateSlug(Review, base, { excludeId: review._id });
  }

  review.canonicalUrl = absoluteUrl(`/restaurant/${restaurant.slug}`);
  if (!review.publishedAt) review.publishedAt = new Date();
  await review.save();

  return {
    restaurantSlug: restaurant.slug,
    reviewSlug: review.slug,
    canonicalUrl: review.canonicalUrl,
  };
}

async function stepOgImage(review) {
  if (review.ogImageUrl && review.schemaVersion >= 1) {
    return { ogImageUrl: review.ogImageUrl, skipped: true };
  }
  if (!s3Enabled()) {
    return { skipped: true, reason: "s3_not_configured" };
  }
  const restaurant = await Restaurant.findById(review.restaurantId).lean();
  const foodItem = await FoodItem.findById(review.foodItem).lean();
  const url = await generateAndUploadOg(review, restaurant, foodItem);
  review.ogImageUrl = url;
  review.ogImageGeneratedAt = new Date();
  await review.save();
  return { ogImageUrl: url };
}

async function stepInternalLinks(review) {
  const related = await suggestRelatedReviews(review);
  review.relatedReviewIds = related;
  await review.save();
  return { relatedReviewIds: related.map(String) };
}

async function stepLockSlug(review) {
  const restaurant = await Restaurant.findById(review.restaurantId);
  if (restaurant && !isSlugLocked(restaurant)) {
    restaurant.slugLockedAt = new Date();
    await restaurant.save();
  }
  review.lastRefreshedAt = new Date();
  await review.save();
  return { locked: true };
}

const STEPS = [
  { name: "slug_canonical", run: stepSlugAndCanonical },
  { name: "og_image", run: stepOgImage },
  { name: "internal_links", run: stepInternalLinks },
  { name: "lock_slug", run: stepLockSlug },
];

/**
 * Orchestrate SEO steps for a published review. Idempotent.
 */
async function onReviewPublished(reviewId) {
  const review = await Review.findById(reviewId);
  if (!review) {
    console.error("onReviewPublished: review not found", reviewId);
    return { ok: false, error: "review_not_found" };
  }

  const results = {};
  for (const step of STEPS) {
    try {
      const result = await step.run(review);
      await logStep(reviewId, step.name, "success", { result });
      results[step.name] = { status: "success", result };
    } catch (err) {
      console.error(`seo step failed: ${step.name}`, reviewId, err);
      await logStep(reviewId, step.name, "failed", {
        error: err.message || String(err),
      });
      results[step.name] = { status: "failed", error: err.message };
    }
  }
  return { ok: true, results };
}

async function rerunFailedSteps(reviewId) {
  const failed = await SeoJob.find({
    reviewId,
    status: "failed",
  }).lean();
  if (!failed.length) return { ok: true, reran: [] };

  const review = await Review.findById(reviewId);
  if (!review) return { ok: false, error: "review_not_found" };

  const reran = [];
  for (const job of failed) {
    const step = STEPS.find((s) => s.name === job.step);
    if (!step) continue;
    try {
      const result = await step.run(review);
      await logStep(reviewId, step.name, "success", { result });
      reran.push({ step: step.name, status: "success" });
    } catch (err) {
      await logStep(reviewId, step.name, "failed", { error: err.message });
      reran.push({ step: step.name, status: "failed", error: err.message });
    }
  }
  return { ok: true, reran };
}

module.exports = {
  onReviewPublished,
  rerunFailedSteps,
  STEPS,
};
