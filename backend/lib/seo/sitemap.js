/**
 * Dynamic sitemap builder. Reads restaurants (with reviews) only — never places.
 */

const mongoose = require("mongoose");
const Restaurant = require("../../models/Restaurant");
const Review = require("../../models/Review");
const Address = require("../../models/Address");
const City = require("../../models/City");
const { absoluteUrl, SITE_URL } = require("./schema");
const { getEligibleTypeSlugs } = require("./publicRankings");
const { kebabSlug } = require("./rankingSlugs");

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(loc, { lastmod, changefreq, priority } = {}) {
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority != null ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function restaurantsWithReviews() {
  const ids = await Review.distinct("restaurantId", {
    $or: [{ publishedAt: { $ne: null } }, { reviewDate: { $exists: true } }],
  });
  if (!ids.length) return [];
  return Restaurant.find({ _id: { $in: ids } })
    .select("slug _id updatedAt cityId")
    .lean();
}

async function citiesWithReviews() {
  const reviewed = await restaurantsWithReviews();
  const cityIds = [
    ...new Set(reviewed.map((r) => r.cityId).filter(Boolean).map(String)),
  ];
  if (cityIds.length) {
    return City.find({
      _id: { $in: cityIds.map((id) => new mongoose.Types.ObjectId(id)) },
      isPublishable: true,
    })
      .select("slug province name")
      .lean();
  }

  // Fallback: derive from Address free-text for restaurants that lack cityId yet
  const restaurantIds = reviewed.map((r) => r._id);
  const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } })
    .select("address")
    .lean();
  const addressIds = restaurants.map((r) => r.address).filter(Boolean);
  const addresses = await Address.find({ _id: { $in: addressIds } })
    .select("city province country")
    .lean();
  const seen = new Map();
  for (const a of addresses) {
    if (!a.city) continue;
    const key = `${a.city}|${a.province || ""}|${a.country || ""}`.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, {
        slug: String(a.city)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        province: a.province || "",
        country: a.country || "Canada",
        name: a.city,
        fromAddress: true,
      });
    }
  }
  return [...seen.values()];
}

async function buildSitemapXml() {
  const now = new Date().toISOString().slice(0, 10);
  const entries = [];

  entries.push(
    urlEntry(`${SITE_URL}/`, {
      lastmod: now,
      changefreq: "daily",
      priority: "1.0",
    })
  );
  entries.push(
    urlEntry(`${SITE_URL}/leaderboards`, {
      lastmod: now,
      changefreq: "daily",
      priority: "0.9",
    })
  );
  entries.push(
    urlEntry(`${SITE_URL}/feed`, {
      lastmod: now,
      changefreq: "hourly",
      priority: "0.7",
    })
  );
  entries.push(
    urlEntry(`${SITE_URL}/scoring-criteria`, {
      lastmod: now,
      changefreq: "monthly",
      priority: "0.5",
    })
  );
  entries.push(
    urlEntry(`${SITE_URL}/map`, {
      lastmod: now,
      changefreq: "weekly",
      priority: "0.6",
    })
  );

  const cities = await citiesWithReviews();
  for (const city of cities) {
    const provinceSlug = kebabSlug(city.province || "");
    const countrySlug = "canada";
    const locName = city.name || city.slug;
    const path = provinceSlug
      ? `/city/${city.slug}/${provinceSlug}/${countrySlug}`
      : `/city/${city.slug}`;
    const lbPath = provinceSlug
      ? `/leaderboards/${city.slug}/${provinceSlug}/${countrySlug}`
      : `/leaderboards/${city.slug}`;
    entries.push(
      urlEntry(absoluteUrl(path), {
        lastmod: now,
        changefreq: "weekly",
        priority: "0.8",
      })
    );
    entries.push(
      urlEntry(absoluteUrl(lbPath), {
        lastmod: now,
        changefreq: "weekly",
        priority: "0.8",
      })
    );

    try {
      const loc = {
        city: locName,
        province: city.province || "",
        country: "Canada",
      };
      const typed = await getEligibleTypeSlugs(loc);
      for (const board of typed) {
        entries.push(
          urlEntry(absoluteUrl(`${lbPath}/${board.slug}`), {
            lastmod: now,
            changefreq: "weekly",
            priority: "0.85",
          })
        );
      }
    } catch (err) {
      console.error("sitemap city boards", city.slug, err.message);
    }
  }

  try {
    const globalTyped = await getEligibleTypeSlugs(null);
    for (const board of globalTyped) {
      entries.push(
        urlEntry(absoluteUrl(`/best/${board.slug}`), {
          lastmod: now,
          changefreq: "daily",
          priority: "0.85",
        })
      );
    }
  } catch (err) {
    console.error("sitemap global boards", err.message);
  }

  const restaurants = await restaurantsWithReviews();
  for (const r of restaurants) {
    const path = r.slug ? `/restaurant/${r.slug}` : `/restaurant/${r._id}`;
    const lastmod = r.updatedAt
      ? new Date(r.updatedAt).toISOString().slice(0, 10)
      : now;
    entries.push(
      urlEntry(absoluteUrl(path), {
        lastmod,
        changefreq: "weekly",
        priority: "0.7",
      })
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");
}

/**
 * Critical invariant: unpromoted places must never appear.
 * Used by tests / admin diagnostics.
 */
async function countRestaurantUrlsInSitemap() {
  const restaurants = await restaurantsWithReviews();
  return restaurants.length;
}

module.exports = {
  buildSitemapXml,
  restaurantsWithReviews,
  countRestaurantUrlsInSitemap,
};
