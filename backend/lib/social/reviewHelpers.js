/**
 * A review is postable when it has at least one real photo URL.
 * Photos are always server URLs from S3 — emoji placeholders never appear here.
 */
function hasRealPhoto(review) {
  const photos = Array.isArray(review?.photos) ? review.photos : [];
  return photos.some((url) => typeof url === "string" && url.trim().length > 0);
}

function pickSourcePhoto(review, preferredUrl) {
  const photos = (Array.isArray(review?.photos) ? review.photos : []).filter(
    (url) => typeof url === "string" && url.trim().length > 0
  );
  if (photos.length === 0) return null;
  if (preferredUrl && photos.includes(preferredUrl)) return preferredUrl;
  return photos[0];
}

function isStaged(review, threshold) {
  const score = Number(review?.score ?? 0);
  return score >= Number(threshold ?? 70);
}

function isPosted(socialPost) {
  if (!socialPost) return false;
  if (socialPost.status === "published") return true;
  const ig = socialPost.targets?.instagram?.postId;
  const x = socialPost.targets?.x?.postId;
  return Boolean(ig || x);
}

function defaultSocialPost() {
  return {
    status: "none",
    caption: null,
    cardImageUrl: null,
    cardGeneratedAt: null,
    sourcePhotoUrl: null,
    targets: {
      instagram: { postId: null, permalink: null, publishedAt: null, error: null },
      x: { postId: null, permalink: null, publishedAt: null, error: null },
    },
    approvedBy: null,
    approvedAt: null,
    updatedAt: null,
  };
}

function ensureSocialPost(review) {
  if (!review.socialPost || typeof review.socialPost !== "object") {
    review.socialPost = defaultSocialPost();
  }
  if (!review.socialPost.targets) {
    review.socialPost.targets = defaultSocialPost().targets;
  }
  return review.socialPost;
}

module.exports = {
  hasRealPhoto,
  pickSourcePhoto,
  isStaged,
  isPosted,
  defaultSocialPost,
  ensureSocialPost,
};
