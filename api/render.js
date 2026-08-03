/**
 * Server-rendered HTML shell with injected meta/JSON-LD for public SPA routes.
 * Crawlers and AI bots that skip JS still see correct head tags.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
let cached = global._mongooseRender;
if (!cached) cached = global._mongooseRender = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  if (cached.promise && mongoose.connection.readyState === 0) {
    cached.promise = null;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

function readIndexHtml() {
  const candidates = [
    path.join(process.cwd(), "frontend/build/index.html"),
    path.join(process.cwd(), "build/index.html"),
    path.join(__dirname, "../frontend/build/index.html"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  return null;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function injectHead(html, { title, description, canonical, image, jsonLd, noindex }) {
  let out = html;
  if (title) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(title)}</title>`);
  }
  const robots = noindex ? "noindex, nofollow" : "index, follow";
  const block = [
    `<meta name="description" content="${escapeAttr(description || "")}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical
      ? `<link rel="canonical" href="${escapeAttr(canonical)}" />`
      : "",
    `<meta property="og:title" content="${escapeAttr(title || "")}" />`,
    `<meta property="og:description" content="${escapeAttr(description || "")}" />`,
    image
      ? `<meta property="og:image" content="${escapeAttr(image)}" />`
      : "",
    canonical
      ? `<meta property="og:url" content="${escapeAttr(canonical)}" />`
      : "",
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(
          /</g,
          "\\u003c"
        )}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  // Preserve any existing GSC verification meta by inserting before </head>
  out = out.replace(/<\/head>/i, `    ${block}\n  </head>`);
  return out;
}

async function resolveMeta(pathname) {
  const site = "https://bestfoodapp.com";
  const defaults = {
    title: "Best Food App - Discover the Best Restaurants in Your City",
    description:
      "Discover, rate, and review the best restaurants in your city. Find top-rated food spots and explore local culinary gems.",
    canonical: `${site}${pathname === "/" ? "" : pathname}`,
    image: `${site}/logo512.png`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Best Food App",
      url: site,
      logo: `${site}/logo512.png`,
      sameAs: [
        "https://www.instagram.com/bestfoodapp",
        "https://www.facebook.com/bestfoodapp",
        "https://x.com/bestfoodapp",
      ],
    },
    noindex: false,
  };

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/submit-review") ||
    pathname.startsWith("/add-restaurant") ||
    pathname.startsWith("/reset-password")
  ) {
    return { ...defaults, noindex: true, title: "Best Food App" };
  }

  try {
    await connectDB();
  } catch {
    return defaults;
  }

  if (pathname.startsWith("/restaurant/")) {
    const key = pathname.split("/")[2];
    const Restaurant = require("../backend/models/Restaurant");
    const Address = require("../backend/models/Address");
    const { restaurantNode, absoluteUrl } = require("../backend/lib/seo/schema");
    const isObjectId = /^[a-f0-9]{24}$/i.test(key);
    let restaurant = await Restaurant.findOne(
      isObjectId ? { $or: [{ slug: key }, { _id: key }] } : { slug: key }
    ).lean();
    if (restaurant) {
      // Legacy ObjectId URL → prefer slug canonical (render layer signals via canonical)
      const address = restaurant.address
        ? await Address.findById(restaurant.address).lean()
        : null;
      const slugPath = restaurant.slug
        ? `/restaurant/${restaurant.slug}`
        : `/restaurant/${restaurant._id}`;
      return {
        title: `${restaurant.name} | Best Food App`,
        description: `Reviews and ratings for ${restaurant.name}${
          address?.city ? ` in ${address.city}` : ""
        }.`,
        canonical: absoluteUrl(slugPath),
        image: defaults.image,
        jsonLd: {
          "@context": "https://schema.org",
          ...restaurantNode(restaurant, address),
        },
        noindex: false,
        redirectTo:
          isObjectId && restaurant.slug && key !== restaurant.slug
            ? slugPath
            : null,
      };
    }
  }

  if (pathname.startsWith("/city/")) {
    const parts = pathname.split("/").filter(Boolean);
    const cityName = parts[1] || "";
    return {
      ...defaults,
      title: `Best Food in ${cityName.replace(/-/g, " ")} | Best Food App`,
      description: `Discover top-rated restaurants and dishes in ${cityName.replace(
        /-/g,
        " "
      )}.`,
      canonical: `${site}${pathname}`,
    };
  }

  if (pathname.startsWith("/leaderboards")) {
    return {
      ...defaults,
      title: "Food Leaderboards | Best Food App",
      description: "Top-rated restaurants and dishes by city and category.",
      canonical: `${site}${pathname}`,
    };
  }

  if (pathname.startsWith("/badge/")) {
    return {
      ...defaults,
      title: "Score Verification | Best Food App",
      description: "Verified Best Food App score badge.",
      canonical: `${site}${pathname}`,
    };
  }

  return defaults;
}

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, "https://bestfoodapp.com");
    const pathname = url.pathname || "/";
    const html = readIndexHtml();
    if (!html) {
      res.statusCode = 500;
      res.end("index.html not found");
      return;
    }

    const meta = await resolveMeta(pathname);
    if (meta.redirectTo) {
      res.statusCode = 301;
      res.setHeader("Location", meta.redirectTo);
      res.end();
      return;
    }

    const body = injectHead(html, meta);
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=86400"
    );
    res.end(body);
  } catch (err) {
    console.error("render error", err);
    res.statusCode = 500;
    res.end("Render error");
  }
};
