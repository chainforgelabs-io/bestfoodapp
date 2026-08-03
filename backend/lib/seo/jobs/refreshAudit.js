/**
 * Monthly: flag reviews >12 months since lastRefreshedAt. Never edits content.
 */

const Review = require("../../../models/Review");
const SeoAuditResult = require("../../../models/SeoAuditResult");

async function runRefreshAudit() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  const stale = await Review.find({
    publishedAt: { $ne: null },
    $or: [
      { lastRefreshedAt: { $lt: cutoff } },
      { lastRefreshedAt: null, publishedAt: { $lt: cutoff } },
    ],
  })
    .select("_id restaurantId score publishedAt lastRefreshedAt")
    .limit(2000)
    .lean();

  const summary = {
    flagged: stale.length,
    cutoff: cutoff.toISOString(),
  };

  await SeoAuditResult.create({
    job: "refreshAudit",
    summary,
    items: stale.map((r) => ({
      reviewId: r._id,
      restaurantId: r.restaurantId,
      publishedAt: r.publishedAt,
      lastRefreshedAt: r.lastRefreshedAt,
    })),
  });

  return summary;
}

module.exports = { runRefreshAudit };
