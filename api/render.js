/**
 * Server-rendered HTML shell with injected meta/JSON-LD and crawlable body
 * lists for public SPA routes. Crawlers that skip JS still see rankings.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const {
  restaurantNode,
  absoluteUrl,
  itemListSchema,
  breadcrumbSchema,
  rankingReviewNodes,
  SITE_URL,
} = require("../backend/lib/seo/schema");
const {
  resolveTypeSlug,
  headingForBoard,
  MIN_TYPED_BOARD,
} = require("../backend/lib/seo/rankingSlugs");
const {
  getTypedBoard,
  getRestaurantBoard,
  getEligibleTypeSlugs,
  getRestaurantSnapshot,
} = require("../backend/lib/seo/publicRankings");
const {
  rankingSnapshot,
  restaurantSnapshot,
  cityHubSnapshot,
  wrapRoot,
  formatAsOf,
} = require("../backend/lib/seo/crawlableHtml");

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

function parseSegment(str) {
  return String(str || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cityFromParts(citySlug, provinceSlug, countrySlug) {
  return {
    city: parseSegment(citySlug),
    province: parseSegment(provinceSlug),
    country: parseSegment(countrySlug) || "Canada",
  };
}

function slugifyPart(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function locationPath(base, loc) {
  return `${base}/${slugifyPart(loc.city)}/${slugifyPart(
    loc.province
  )}/${slugifyPart(loc.country || "Canada")}`;
}

function stripDefaultSeoTags(html) {
  return html
    .replace(/<link rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<meta name="description"[^>]*>\s*/gi, "")
    .replace(/<meta name="robots"[^>]*>\s*/gi, "")
    .replace(/<meta name="keywords"[^>]*>\s*/gi, "")
    .replace(/<meta property="og:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<meta name="twitter:[^"]+"[^>]*>\s*/gi, "")
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi,
      ""
    );
}

function injectHead(html, { title, description, canonical, image, jsonLd, noindex }) {
  let out = stripDefaultSeoTags(html);
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
    `<meta name="twitter:title" content="${escapeAttr(title || "")}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description || "")}" />`,
    jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(
          /</g,
          "\\u003c"
        )}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  out = out.replace(/<\/head>/i, `    ${block}\n  </head>`);
  return out;
}

function injectRoot(html, inner) {
  if (!inner) return html;
  if (/<div id="root"><\/div>/i.test(html)) {
    return html.replace(
      /<div id="root"><\/div>/i,
      `<div id="root">${inner}</div>`
    );
  }
  return html.replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    `<div id="root">${inner}</div>`
  );
}

function collectionGraph({ name, description, url, crumbs, items, asOf }) {
  const page = {
    "@type": ["WebPage", "CollectionPage"],
    name,
    description,
    url,
  };
  if (asOf) page.dateModified = new Date(asOf).toISOString();
  return {
    "@context": "https://schema.org",
    "@graph": [
      page,
      breadcrumbSchema(crumbs),
      itemListSchema(items, { name, url }),
      ...rankingReviewNodes(items, asOf),
    ],
  };
}

async function resolveMeta(pathname) {
  const site = SITE_URL;
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
    rootHtml: "",
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

  const parts = pathname.split("/").filter(Boolean);

  if (pathname.startsWith("/restaurant/")) {
    const key = parts[1];
    const snap = await getRestaurantSnapshot(key);
    if (snap) {
      const { restaurant, dishes, asOf } = snap;
      const address = restaurant.address || null;
      const slugPath = restaurant.slug
        ? `/restaurant/${restaurant.slug}`
        : `/restaurant/${restaurant._id}`;
      const title = `${restaurant.name} | Best Food App`;
      const description = `Reviews and ratings for ${restaurant.name}${
        address?.city ? ` in ${address.city}` : ""
      }. Top dishes scored out of 100.`;
      const url = absoluteUrl(slugPath);
      const crumbs = [
        { name: "Home", url: "/" },
        { name: restaurant.name, url: slugPath },
      ];
      return {
        title,
        description,
        canonical: url,
        image: defaults.image,
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [
            restaurantNode(restaurant, address),
            breadcrumbSchema(crumbs),
            itemListSchema(dishes, {
              name: `Top dishes at ${restaurant.name}`,
              url: slugPath,
            }),
            ...rankingReviewNodes(dishes, asOf),
          ],
        },
        noindex: false,
        redirectTo:
          /^[a-f0-9]{24}$/i.test(key) &&
          restaurant.slug &&
          key !== restaurant.slug
            ? slugPath
            : null,
        rootHtml: wrapRoot(
          restaurantSnapshot({ restaurant, dishes, asOf })
        ),
      };
    }
  }

  if (parts[0] === "best" && parts[1]) {
    const board = resolveTypeSlug(parts[1]);
    const packed = await getTypedBoard({ slug: parts[1] });
    const h1 = headingForBoard(board, null);
    const url = `${site}/best/${board.slug}`;
    const crumbs = [
      { name: "Home", url: "/" },
      { name: "Leaderboards", url: "/leaderboards" },
      { name: h1, url: `/best/${board.slug}` },
    ];
    const asOf = packed?.asOf;
    const items = packed?.items || [];
    const description = `${h1} ranked by blended expert and community scores.${
      asOf ? ` As of ${formatAsOf(asOf)}.` : ""
    }`;
    return {
      title: `${h1} | Best Food App`,
      description,
      canonical: url,
      image: defaults.image,
      jsonLd: collectionGraph({
        name: h1,
        description,
        url,
        crumbs,
        items,
        asOf,
      }),
      noindex: (packed?.count || 0) < MIN_TYPED_BOARD,
      rootHtml: wrapRoot(
        rankingSnapshot({
          h1,
          crumbs,
          items,
          asOf,
        })
      ),
    };
  }

  if (parts[0] === "leaderboards") {
    const citySlug = parts[1];
    const provinceSlug = parts[2];
    const countrySlug = parts[3];
    const typeSlug = parts[4];

    if (!citySlug) {
      const packed = await getRestaurantBoard(null);
      const eligible = await getEligibleTypeSlugs(null);
      const h1 = "Food leaderboards";
      const url = `${site}/leaderboards`;
      const crumbs = [
        { name: "Home", url: "/" },
        { name: "Leaderboards", url: "/leaderboards" },
      ];
      const extraLinks = eligible.map((b) => ({
        name: headingForBoard(b),
        url: `/best/${b.slug}`,
      }));
      const description =
        "Rankings of the best restaurants and dishes by blended expert and community scores.";
      return {
        title: "Best restaurants and dishes | Food leaderboards",
        description,
        canonical: url,
        image: defaults.image,
        jsonLd: collectionGraph({
          name: h1,
          description,
          url,
          crumbs,
          items: packed.items,
          asOf: packed.asOf,
        }),
        noindex: false,
        rootHtml: wrapRoot(
          rankingSnapshot({
            h1,
            crumbs,
            items: packed.items,
            asOf: packed.asOf,
            extraLinks,
          })
        ),
      };
    }

    if (citySlug && provinceSlug && countrySlug) {
      const loc = cityFromParts(citySlug, provinceSlug, countrySlug);
      const cityLabel = `${loc.city}, ${loc.province}`;
      const cityLbPath = locationPath("/leaderboards", loc);

      if (typeSlug) {
        const board = resolveTypeSlug(typeSlug);
        const packed = await getTypedBoard({
          slug: typeSlug,
          ...loc,
        });
        const h1 = headingForBoard(board, loc.city);
        const url = `${site}${cityLbPath}/${board.slug}`;
        const crumbs = [
          { name: "Home", url: "/" },
          { name: "Leaderboards", url: "/leaderboards" },
          { name: cityLabel, url: cityLbPath },
          { name: h1, url: `${cityLbPath}/${board.slug}` },
        ];
        const description = `${h1} ranked by blended expert and community scores.${
          packed.asOf ? ` As of ${formatAsOf(packed.asOf)}.` : ""
        }`;
        return {
          title: `${h1} | Best Food App`,
          description,
          canonical: url,
          image: defaults.image,
          jsonLd: collectionGraph({
            name: h1,
            description,
            url,
            crumbs,
            items: packed.items,
            asOf: packed.asOf,
          }),
          noindex: (packed.count || 0) < MIN_TYPED_BOARD,
          rootHtml: wrapRoot(
            rankingSnapshot({
              h1,
              crumbs,
              items: packed.items,
              asOf: packed.asOf,
            })
          ),
        };
      }

      const packed = await getRestaurantBoard(loc);
      const eligible = await getEligibleTypeSlugs(loc);
      const h1 = `Best restaurants in ${loc.city}`;
      const url = `${site}${cityLbPath}`;
      const crumbs = [
        { name: "Home", url: "/" },
        { name: "Leaderboards", url: "/leaderboards" },
        { name: cityLabel, url: cityLbPath },
      ];
      const extraLinks = eligible.map((b) => ({
        name: headingForBoard(b, loc.city),
        url: `${cityLbPath}/${b.slug}`,
      }));
      const description = `See the top dishes and restaurants in ${cityLabel}. Compare ratings and discover what locals rank highest.`;
      return {
        title: `${loc.city} Food Leaderboards | Top Restaurants & Food Rankings`,
        description,
        canonical: url,
        image: defaults.image,
        jsonLd: collectionGraph({
          name: h1,
          description,
          url,
          crumbs,
          items: packed.items,
          asOf: packed.asOf,
        }),
        noindex: false,
        rootHtml: wrapRoot(
          rankingSnapshot({
            h1,
            crumbs,
            items: packed.items,
            asOf: packed.asOf,
            extraLinks,
          })
        ),
      };
    }

    return {
      ...defaults,
      title: "Food Leaderboards | Best Food App",
      description: "Top-rated restaurants and dishes by city and category.",
      canonical: `${site}${pathname}`,
    };
  }

  if (parts[0] === "city" && parts[1]) {
    const loc = cityFromParts(parts[1], parts[2], parts[3] || "canada");
    const cityLabel = [loc.city, loc.province].filter(Boolean).join(", ");
    const packed = await getRestaurantBoard(loc);
    const eligible = await getEligibleTypeSlugs(loc);
    const cityPage = locationPath("/city", loc);
    const lbPath = locationPath("/leaderboards", loc);
    const extraLinks = [
      { name: `Best restaurants in ${loc.city}`, url: lbPath },
      ...eligible.map((b) => ({
        name: headingForBoard(b, loc.city),
        url: `${lbPath}/${b.slug}`,
      })),
    ];
    const crumbs = [
      { name: "Home", url: "/" },
      { name: cityLabel, url: cityPage },
    ];
    const description = `Discover top-rated restaurants and dishes in ${cityLabel}.`;
    return {
      title: `Best Food in ${cityLabel} | Best Food App`,
      description,
      canonical: `${site}${cityPage}`,
      image: defaults.image,
      jsonLd: collectionGraph({
        name: `Best food in ${cityLabel}`,
        description,
        url: `${site}${cityPage}`,
        crumbs,
        items: packed.items,
        asOf: packed.asOf,
      }),
      noindex: false,
      rootHtml: wrapRoot(
        cityHubSnapshot({
          cityLabel,
          crumbs,
          restaurantItems: packed.items,
          asOf: packed.asOf,
          extraLinks,
        })
      ),
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

  if (pathname === "/") {
    const packed = await getRestaurantBoard(null);
    const eligible = await getEligibleTypeSlugs(null);
    const extraLinks = [
      { name: "Food leaderboards", url: "/leaderboards" },
      ...eligible.map((b) => ({
        name: headingForBoard(b),
        url: `/best/${b.slug}`,
      })),
    ];
    return {
      ...defaults,
      rootHtml: wrapRoot(
        rankingSnapshot({
          h1: "Find the best food in your city",
          crumbs: [{ name: "Home", url: "/" }],
          items: packed.items,
          asOf: packed.asOf,
          extraLinks,
        })
      ),
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

    let body = injectHead(html, meta);
    body = injectRoot(body, meta.rootHtml);
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
