/**
 * Admin SEO metrics + badge helpers.
 */

const express = require("express");
const Review = require("../models/Review");
const Restaurant = require("../models/Restaurant");
const SeoJob = require("../models/SeoJob");
const SeoAuditResult = require("../models/SeoAuditResult");
const BadgeEmbed = require("../models/BadgeEmbed");
const PlaceBatch = require("../models/PlaceBatch");
const { protect, admin } = require("../middleware/authMiddleware");
const { restaurantsWithReviews } = require("../lib/seo/sitemap");
const {
  buildEmbedSnippet,
  verificationPayload,
  isBadgeEligible,
  isBadgeProgramLive,
  HERO_FLOOR,
} = require("../lib/seo/badges");
const { rerunFailedSteps } = require("../lib/seo");

const router = express.Router();

router.get("/dashboard", protect, admin, async (req, res) => {
  try {
    const publishedReviews = await Review.countDocuments({
      publishedAt: { $ne: null },
    });
    const restaurants = await restaurantsWithReviews();
    const failedJobs = await SeoJob.countDocuments({ status: "failed" });
    const liveEmbeds = await BadgeEmbed.countDocuments({ isLive: true });
    const batches = await PlaceBatch.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const recentAudits = await SeoAuditResult.find({})
      .sort({ ranAt: -1 })
      .limit(10)
      .lean();

    // Categories with 5+ scored admin reviews (go-live gate proxy)
    const categoryCounts = await Review.aggregate([
      { $match: { userRole: "admin" } },
      {
        $lookup: {
          from: "fooditems",
          localField: "foodItem",
          foreignField: "_id",
          as: "fi",
        },
      },
      { $unwind: "$fi" },
      {
        $group: {
          _id: { category: "$fi.category", type: "$fi.type" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: 5 } } },
    ]);

    const badgeProgramLive = await isBadgeProgramLive();

    res.json({
      publishedReviews,
      restaurantPages: restaurants.length,
      restaurantsWithSlug: restaurants.filter((r) => r.slug).length,
      indexedRatioEstimate:
        restaurants.length === 0
          ? null
          : restaurants.filter((r) => r.slug).length / restaurants.length,
      failedSeoJobs: failedJobs,
      liveBadgeEmbeds: liveEmbeds,
      categoriesLive: categoryCounts.length,
      badgeProgramLive,
      heroFloor: HERO_FLOOR,
      recentBatches: batches,
      recentAudits,
    });
  } catch (err) {
    console.error("seo dashboard", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/badge/:restaurantId", protect, admin, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId).lean();
    if (!restaurant) return res.status(404).json({ message: "Not found" });
    const top = await Review.findOne({ restaurantId: restaurant._id })
      .sort({ score: -1 })
      .lean();
    const score = top?.score || 0;
    const programLive = await isBadgeProgramLive();
    res.json({
      eligible: programLive && isBadgeEligible(score),
      badgeProgramLive: programLive,
      embed: programLive ? buildEmbedSnippet(restaurant) : null,
      verification: verificationPayload({
        restaurant,
        score,
        scoredAt: top?.publishedAt || top?.reviewDate,
      }),
    });
  } catch (err) {
    console.error("seo badge", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/rerun/:reviewId", protect, admin, async (req, res) => {
  try {
    const result = await rerunFailedSteps(req.params.reviewId);
    res.json(result);
  } catch (err) {
    console.error("seo rerun", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
