/**
 * Visible critic status from review count. Points still increment on submit;
 * listing on a city critic board requires 10 reviews in that city.
 */

const CRITIC_REVIEW_THRESHOLD = 10;

function criticTitleFromCount(reviewCount) {
  const n = Number(reviewCount) || 0;
  if (n >= CRITIC_REVIEW_THRESHOLD) return "City critic";
  if (n >= 1) return "Contributor";
  return "New reviewer";
}

function criticStatus(reviewCount, points = 0) {
  const n = Number(reviewCount) || 0;
  const remaining = Math.max(0, CRITIC_REVIEW_THRESHOLD - n);
  return {
    title: criticTitleFromCount(n),
    reviewCount: n,
    points: Number(points) || 0,
    threshold: CRITIC_REVIEW_THRESHOLD,
    remaining,
    isCityCritic: n >= CRITIC_REVIEW_THRESHOLD,
  };
}

module.exports = {
  CRITIC_REVIEW_THRESHOLD,
  criticTitleFromCount,
  criticStatus,
};
