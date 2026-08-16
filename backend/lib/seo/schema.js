/**
 * JSON-LD builders for Restaurant (nested in Review), Review, ItemList,
 * BreadcrumbList, and sitewide Organization.
 */

const SITE_URL = "https://bestfoodapp.com";
const SITE_NAME = "Best Food App";

function absoluteUrl(path) {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo512.png`,
    sameAs: [
      "https://www.instagram.com/bestfoodapp",
      "https://www.facebook.com/bestfoodapp",
      "https://x.com/bestfoodapp",
    ],
  };
}

function postalAddressFrom(address) {
  if (!address) return undefined;
  return {
    "@type": "PostalAddress",
    streetAddress: address.street || undefined,
    addressLocality: address.city || undefined,
    addressRegion: address.province || undefined,
    postalCode: address.postalCode || undefined,
    addressCountry: address.country || "CA",
  };
}

function restaurantNode(restaurant, address, { includeRatings = false } = {}) {
  if (!restaurant) return null;
  const node = {
    "@type": "Restaurant",
    name: restaurant.name,
    url: restaurant.slug
      ? absoluteUrl(`/restaurant/${restaurant.slug}`)
      : absoluteUrl(`/restaurant/${restaurant._id}`),
    servesCuisine: restaurant.cuisine || undefined,
    address: postalAddressFrom(address),
  };
  if (restaurant.location?.coordinates?.length === 2) {
    node.geo = {
      "@type": "GeoCoordinates",
      longitude: restaurant.location.coordinates[0],
      latitude: restaurant.location.coordinates[1],
    };
  }
  if (restaurant.website) node.url = restaurant.website;
  // Never emit free-floating aggregate ratings for third-party businesses.
  if (includeRatings) {
    // reserved — ratings live on Review nodes only
  }
  return node;
}

function reviewSchema({ review, restaurant, address, author, foodItem }) {
  if (!review || !restaurant) return null;
  const itemReviewed = restaurantNode(restaurant, address);
  if (foodItem?.name) {
    itemReviewed.name = `${foodItem.name} at ${restaurant.name}`;
    itemReviewed["@type"] = "MenuItem";
  }

  return {
    "@context": "https://schema.org",
    "@type": "Review",
    url: review.canonicalUrl || undefined,
    datePublished: (review.publishedAt || review.reviewDate || undefined)
      ? new Date(review.publishedAt || review.reviewDate).toISOString()
      : undefined,
    dateModified: review.lastRefreshedAt
      ? new Date(review.lastRefreshedAt).toISOString()
      : undefined,
    reviewBody: review.comment || undefined,
    author: author
      ? {
          "@type": "Person",
          name: author.username || author.email || "Critic",
        }
      : undefined,
    reviewRating: {
      "@type": "Rating",
      ratingValue: Math.round(review.score || 0),
      bestRating: 100,
      worstRating: 0,
    },
    itemReviewed,
  };
}

function itemListSchema(items, { name, url } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: name || "Leaderboard",
    url: url ? absoluteUrl(url) : undefined,
    itemListElement: (items || []).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url ? absoluteUrl(item.url) : undefined,
    })),
  };
}

function rankingReviewNodes(items, asOf) {
  return (items || [])
    .filter((item) => Number.isFinite(Number(item.score)) && Number(item.score) > 0)
    .map((item) => {
      const published = item.reviewDate || asOf;
      return {
        "@type": "Review",
        datePublished: published
          ? new Date(published).toISOString()
          : undefined,
        reviewRating: {
          "@type": "Rating",
          ratingValue: Number(item.score),
          bestRating: 100,
          worstRating: 0,
        },
        itemReviewed: {
          "@type": item.restaurantName ? "MenuItem" : "Restaurant",
          name: item.restaurantName
            ? `${item.name} at ${item.restaurantName}`
            : item.name,
          url: item.url ? absoluteUrl(item.url) : undefined,
        },
      };
    });
}

function breadcrumbSchema(crumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (crumbs || []).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.url),
    })),
  };
}

module.exports = {
  SITE_URL,
  SITE_NAME,
  absoluteUrl,
  organizationSchema,
  restaurantNode,
  reviewSchema,
  itemListSchema,
  breadcrumbSchema,
  rankingReviewNodes,
};
