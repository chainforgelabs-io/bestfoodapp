/**
 * Ranking payloads for crawlable public pages (render.js + sitemap).
 */

const FoodItem = require("../../models/FoodItem");
const Restaurant = require("../../models/Restaurant");
const Address = require("../../models/Address");
const Review = require("../../models/Review");
const {
  provinceSearchPattern,
  countrySearchPattern,
} = require("../places/addressNormalize");
const {
  MIN_TYPED_BOARD,
  SLUG_BOARDS,
  resolveTypeSlug,
  slugForValue,
  headingForBoard,
} = require("./rankingSlugs");

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function restaurantHref(restaurant) {
  if (!restaurant) return "/";
  if (restaurant.slug) return `/restaurant/${restaurant.slug}`;
  if (restaurant._id) return `/restaurant/${restaurant._id}`;
  return "/";
}

const SCORE_EXPR = {
  $cond: {
    if: {
      $and: [{ $gt: ["$adminScore", 0] }, { $gt: ["$communityScore", 0] }],
    },
    then: { $divide: [{ $add: ["$adminScore", "$communityScore"] }, 2] },
    else: {
      $cond: {
        if: { $gt: ["$adminScore", 0] },
        then: "$adminScore",
        else: "$communityScore",
      },
    },
  },
};

async function addressIdsForLocation({ city, province, country } = {}) {
  if (!city) return null;
  const tryQuery = async (includeRegion) => {
    const q = { city: new RegExp(`^${escapeRegex(city)}$`, "i") };
    if (includeRegion) {
      const provPat = provinceSearchPattern(province);
      if (provPat) q.province = new RegExp(provPat, "i");
      const ctryPat = countrySearchPattern(country);
      if (ctryPat) q.country = new RegExp(ctryPat, "i");
    }
    const addrs = await Address.find(q).select("_id").lean();
    return addrs.map((a) => a._id);
  };
  let ids = await tryQuery(true);
  if (!ids.length) ids = await tryQuery(false);
  return ids;
}

async function restaurantIdsInCity(location) {
  const addressIds = await addressIdsForLocation(location);
  if (!addressIds || !addressIds.length) return [];
  const rows = await Restaurant.find({ address: { $in: addressIds } })
    .select("_id")
    .lean();
  return rows.map((r) => r._id);
}

async function latestReviewDate(restaurantIds) {
  if (!restaurantIds?.length) return null;
  const row = await Review.findOne({ restaurantId: { $in: restaurantIds } })
    .sort({ reviewDate: -1 })
    .select("reviewDate")
    .lean();
  return row?.reviewDate || null;
}

function formatItem(doc, { dish } = {}) {
  const restaurant = dish ? doc.restaurant : doc;
  const name = dish ? doc.name : restaurant?.name;
  const score = Math.round(
    doc.overallAverageScore || doc.calculatedScore || doc.avgScore || 0
  );
  return {
    name: name || "Unknown",
    restaurantName: dish ? restaurant?.name || "" : "",
    restaurant: restaurant?.name || name || "",
    city: restaurant?.address?.city || doc.address?.city || "",
    score,
    reviewDate: null,
    url: restaurantHref(restaurant),
  };
}

async function getFoodBoard(board, location) {
  const matchField = board.matchField || "type";
  const match = {
    [matchField]: board.value,
    $or: [{ adminScore: { $gt: 0 } }, { communityScore: { $gt: 0 } }],
  };
  if (location?.city) {
    const rids = await restaurantIdsInCity(location);
    if (!rids.length) return { items: [], asOf: null, count: 0 };
    match.restaurant = { $in: rids };
  }

  const count = await FoodItem.countDocuments(match);
  const docs = await FoodItem.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurant",
        foreignField: "_id",
        as: "restaurant",
      },
    },
    { $unwind: "$restaurant" },
    {
      $lookup: {
        from: "addresses",
        localField: "restaurant.address",
        foreignField: "_id",
        as: "restaurant.address",
      },
    },
    { $unwind: { path: "$restaurant.address", preserveNullAndEmptyArrays: true } },
    { $addFields: { calculatedScore: SCORE_EXPR } },
    { $sort: { calculatedScore: -1 } },
    { $limit: 10 },
    {
      $project: {
        name: 1,
        calculatedScore: 1,
        overallAverageScore: { $round: ["$calculatedScore", 0] },
        restaurant: {
          _id: "$restaurant._id",
          name: "$restaurant.name",
          slug: "$restaurant.slug",
          address: "$restaurant.address",
        },
      },
    },
  ]);

  const items = docs.map((d) => formatItem(d, { dish: true }));
  const asOf = await latestReviewDate(
    docs.map((d) => d.restaurant?._id).filter(Boolean)
  );
  items.forEach((item) => {
    item.reviewDate = asOf;
  });
  return { items, asOf, count };
}

async function getCuisineBoard(board, location) {
  const cuisineMatch = { cuisine: { $regex: new RegExp(escapeRegex(board.value), "i") } };
  if (location?.city) {
    const addressIds = await addressIdsForLocation(location);
    if (!addressIds?.length) return { items: [], asOf: null, count: 0 };
    cuisineMatch.address = { $in: addressIds };
  }

  const docs = await Restaurant.aggregate([
    { $match: cuisineMatch },
    {
      $lookup: {
        from: "addresses",
        localField: "address",
        foreignField: "_id",
        as: "address",
      },
    },
    { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "fooditems",
        localField: "_id",
        foreignField: "restaurant",
        as: "foodItems",
      },
    },
    {
      $addFields: {
        avgScore: {
          $avg: {
            $map: {
              input: {
                $filter: {
                  input: "$foodItems",
                  cond: {
                    $or: [
                      { $gt: ["$$this.adminScore", 0] },
                      { $gt: ["$$this.communityScore", 0] },
                    ],
                  },
                },
              },
              as: "item",
              in: {
                $cond: {
                  if: {
                    $and: [
                      { $gt: ["$$item.adminScore", 0] },
                      { $gt: ["$$item.communityScore", 0] },
                    ],
                  },
                  then: {
                    $divide: [
                      { $add: ["$$item.adminScore", "$$item.communityScore"] },
                      2,
                    ],
                  },
                  else: {
                    $cond: {
                      if: { $gt: ["$$item.adminScore", 0] },
                      then: "$$item.adminScore",
                      else: "$$item.communityScore",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    { $match: { avgScore: { $exists: true, $gt: 0 } } },
    { $sort: { avgScore: -1 } },
    {
      $facet: {
        count: [{ $count: "n" }],
        items: [
          { $limit: 10 },
          {
            $project: {
              name: 1,
              slug: 1,
              avgScore: 1,
              overallAverageScore: { $round: ["$avgScore", 0] },
              address: 1,
            },
          },
        ],
      },
    },
  ]);

  const count = docs[0]?.count?.[0]?.n || 0;
  const items = (docs[0]?.items || []).map((d) => formatItem(d));
  const asOf = await latestReviewDate((docs[0]?.items || []).map((d) => d._id));
  items.forEach((item) => {
    item.reviewDate = asOf;
  });
  return { items, asOf, count };
}

async function getRestaurantBoard(location) {
  const cuisineMatch = {};
  if (location?.city) {
    const addressIds = await addressIdsForLocation(location);
    if (!addressIds?.length) return { items: [], asOf: null, count: 0 };
    cuisineMatch.address = { $in: addressIds };
  }

  const docs = await Restaurant.aggregate([
    ...(Object.keys(cuisineMatch).length ? [{ $match: cuisineMatch }] : []),
    {
      $lookup: {
        from: "addresses",
        localField: "address",
        foreignField: "_id",
        as: "address",
      },
    },
    { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "fooditems",
        localField: "_id",
        foreignField: "restaurant",
        as: "foodItems",
      },
    },
    { $match: { foodItems: { $ne: [] } } },
    {
      $addFields: {
        avgScore: {
          $avg: {
            $map: {
              input: {
                $filter: {
                  input: "$foodItems",
                  cond: {
                    $or: [
                      { $gt: ["$$this.adminScore", 0] },
                      { $gt: ["$$this.communityScore", 0] },
                    ],
                  },
                },
              },
              as: "item",
              in: {
                $cond: {
                  if: {
                    $and: [
                      { $gt: ["$$item.adminScore", 0] },
                      { $gt: ["$$item.communityScore", 0] },
                    ],
                  },
                  then: {
                    $divide: [
                      { $add: ["$$item.adminScore", "$$item.communityScore"] },
                      2,
                    ],
                  },
                  else: {
                    $cond: {
                      if: { $gt: ["$$item.adminScore", 0] },
                      then: "$$item.adminScore",
                      else: "$$item.communityScore",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    { $match: { avgScore: { $exists: true, $gt: 0 } } },
    { $sort: { avgScore: -1 } },
    {
      $facet: {
        count: [{ $count: "n" }],
        items: [
          { $limit: 10 },
          {
            $project: {
              name: 1,
              slug: 1,
              avgScore: 1,
              overallAverageScore: { $round: ["$avgScore", 0] },
              address: 1,
            },
          },
        ],
      },
    },
  ]);

  const count = docs[0]?.count?.[0]?.n || 0;
  const items = (docs[0]?.items || []).map((d) => formatItem(d));
  const asOf = await latestReviewDate((docs[0]?.items || []).map((d) => d._id));
  items.forEach((item) => {
    item.reviewDate = asOf;
  });
  return { items, asOf, count };
}

async function getTypedBoard({ slug, city, province, country } = {}) {
  const board = resolveTypeSlug(slug);
  if (!board) return null;
  const location = city ? { city, province, country } : null;
  if (board.kind === "cuisine") {
    const result = await getCuisineBoard(board, location);
    return { board, ...result };
  }
  const result = await getFoodBoard(board, location);
  return { board, ...result };
}

async function getEligibleTypeSlugs(location = null) {
  const out = [];
  for (const [slug, meta] of Object.entries(SLUG_BOARDS)) {
    const packed = await getTypedBoard({
      slug,
      city: location?.city,
      province: location?.province,
      country: location?.country,
    });
    if ((packed?.count || 0) >= MIN_TYPED_BOARD) {
      out.push({
        slug,
        title: meta.title,
        kind: meta.kind,
        count: packed.count,
        heading: headingForBoard({ ...meta, slug }, location?.city),
      });
    }
  }

  const extraMatch = {
    $or: [{ adminScore: { $gt: 0 } }, { communityScore: { $gt: 0 } }],
  };
  if (location?.city) {
    const rids = await restaurantIdsInCity(location);
    if (rids.length) extraMatch.restaurant = { $in: rids };
    else return out;
  }
  const types = await FoodItem.distinct("type", extraMatch);
  const knownValues = new Set(
    Object.values(SLUG_BOARDS)
      .filter((b) => b.kind === "food")
      .map((b) => b.value.toLowerCase())
  );
  for (const type of types) {
    if (!type || knownValues.has(String(type).toLowerCase())) continue;
    const slug = slugForValue(type, "food");
    if (out.some((x) => x.slug === slug)) continue;
    const packed = await getTypedBoard({
      slug,
      city: location?.city,
      province: location?.province,
      country: location?.country,
    });
    if ((packed?.count || 0) >= MIN_TYPED_BOARD) {
      out.push({
        slug,
        title: packed.board.title,
        kind: "food",
        count: packed.count,
        heading: headingForBoard(packed.board, location?.city),
      });
    }
  }
  return out;
}

async function getRestaurantSnapshot(key) {
  const isObjectId = /^[a-f0-9]{24}$/i.test(key);
  const restaurant = await Restaurant.findOne(
    isObjectId ? { $or: [{ slug: key }, { _id: key }] } : { slug: key }
  )
    .populate("address")
    .lean();
  if (!restaurant) return null;

  const foodItems = await FoodItem.find({
    restaurant: restaurant._id,
    $or: [{ adminScore: { $gt: 0 } }, { communityScore: { $gt: 0 } }],
  })
    .select("name type category adminScore communityScore")
    .lean();

  const dishes = foodItems
    .map((item) => {
      const admin = Number(item.adminScore || 0);
      const community = Number(item.communityScore || 0);
      let score = 0;
      if (admin > 0 && community > 0) score = (admin + community) / 2;
      else score = admin > 0 ? admin : community;
      return {
        name: item.name,
        restaurantName: restaurant.name,
        city: restaurant.address?.city || "",
        score: Math.round(score),
        url: restaurantHref(restaurant),
      };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const asOf = await latestReviewDate([restaurant._id]);
  dishes.forEach((item) => {
    item.reviewDate = asOf;
  });
  return { restaurant, dishes, asOf };
}

module.exports = {
  MIN_TYPED_BOARD,
  restaurantHref,
  getTypedBoard,
  getRestaurantBoard,
  getEligibleTypeSlugs,
  getRestaurantSnapshot,
  headingForBoard,
};
