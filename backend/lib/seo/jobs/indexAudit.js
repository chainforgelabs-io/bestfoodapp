/**
 * Weekly: published vs indexable URL reconciliation.
 * Full GSC API requires GOOGLE_SERVICE_ACCOUNT_JSON — when absent, reports
 * published counts only for admin visibility.
 */

const Review = require("../../../models/Review");
const Restaurant = require("../../../models/Restaurant");
const SeoAuditResult = require("../../../models/SeoAuditResult");
const { restaurantsWithReviews } = require("../sitemap");

async function runIndexAudit() {
  const publishedReviews = await Review.countDocuments({
    publishedAt: { $ne: null },
  });
  const reviewedRestaurants = await restaurantsWithReviews();
  const withSlug = reviewedRestaurants.filter((r) => r.slug).length;

  let gsc = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GSC_SITE_URL) {
    gsc = {
      note: "GSC API credentials present — wire Search Console client when ready",
      siteUrl: process.env.GSC_SITE_URL,
    };
  }

  const summary = {
    publishedReviews,
    restaurantPages: reviewedRestaurants.length,
    restaurantsWithSlug: withSlug,
    indexedRatioEstimate: null,
    gsc,
  };

  await SeoAuditResult.create({
    job: "indexAudit",
    summary,
    items: reviewedRestaurants.slice(0, 200).map((r) => ({
      restaurantId: r._id,
      slug: r.slug,
      url: r.slug
        ? `https://bestfoodapp.com/restaurant/${r.slug}`
        : `https://bestfoodapp.com/restaurant/${r._id}`,
    })),
  });

  return summary;
}

module.exports = { runIndexAudit };
