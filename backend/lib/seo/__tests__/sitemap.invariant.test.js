/**
 * Critical invariant: unpromoted places never appear in the sitemap.
 *
 * Run: node backend/lib/seo/__tests__/sitemap.invariant.test.js
 * Requires MONGODB_URI. Creates temporary docs and cleans them up.
 */

const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

async function main() {
  if (!process.env.MONGODB_URI) {
    console.log("SKIP: MONGODB_URI not set");
    process.exit(0);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const Place = require("../../../models/Place");
  const Restaurant = require("../../../models/Restaurant");
  const Review = require("../../../models/Review");
  const Address = require("../../../models/Address");
  const User = require("../../../models/User");
  const {
    countRestaurantUrlsInSitemap,
    buildSitemapXml,
  } = require("../sitemap");

  const tag = `seo-invariant-${Date.now()}`;
  const user =
    (await User.findOne({ role: "admin" })) ||
    (await User.create({
      email: `${tag}@example.com`,
      username: tag,
      password: "test-password-hash",
      role: "admin",
    }));

  // Seed many unpromoted places
  const placeOps = [];
  for (let i = 0; i < 100; i += 1) {
    placeOps.push({
      gersId: `${tag}-gers-${i}`,
      name: `Seed Place ${i}`,
      nameRaw: `Seed Place ${i}`,
      address: { locality: "Saskatoon", region: "SK", country: "CA" },
      status: "active",
      cityAssignment: "within",
    });
  }
  await Place.insertMany(placeOps);

  const address = await Address.create({
    street: "1 Test St",
    city: "Saskatoon",
    province: "SK",
    country: "Canada",
  });

  const restaurants = [];
  for (let i = 0; i < 3; i += 1) {
    restaurants.push(
      await Restaurant.create({
        name: `${tag}-Restaurant-${i}`,
        address: address._id,
        type: "Casual Dining",
        cuisine: ["Test"],
        createdBy: user._id,
        slug: `${tag}-restaurant-${i}`,
      })
    );
  }

  for (const r of restaurants) {
    await Review.create({
      userId: user._id,
      userRole: "admin",
      restaurantId: r._id,
      foodItem: new mongoose.Types.ObjectId(),
      score: 80,
      purchaseDate: new Date(),
      publishedAt: new Date(),
    });
  }

  const count = await countRestaurantUrlsInSitemap();
  const xml = await buildSitemapXml();

  // Cleanup
  await Place.deleteMany({ gersId: { $regex: `^${tag}` } });
  await Review.deleteMany({ restaurantId: { $in: restaurants.map((r) => r._id) } });
  await Restaurant.deleteMany({ _id: { $in: restaurants.map((r) => r._id) } });
  await Address.deleteOne({ _id: address._id });

  await mongoose.disconnect();

  const placeMentions = (xml.match(/Seed Place/g) || []).length;
  if (placeMentions > 0) {
    console.error("FAIL: sitemap mentions unpromoted place names");
    process.exit(1);
  }

  // At least the 3 restaurants we created should be counted (may be more in DB)
  if (count < 3) {
    console.error(`FAIL: expected >= 3 restaurant URLs, got ${count}`);
    process.exit(1);
  }

  console.log(
    `PASS: sitemap has ${count} restaurant URLs; 100 unpromoted places excluded`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
