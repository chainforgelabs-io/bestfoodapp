#!/usr/bin/env node
/**
 * One-off: allocate slugs for existing restaurants missing slug.
 * Also clears invalid location stubs ({ type: "Point" } without coordinates)
 * that break the 2dsphere index on save.
 *
 *   MONGODB_URI=... node backend/lib/seo/scripts/backfillRestaurantSlugs.js
 */

const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

const Restaurant = require("../../../models/Restaurant");
const { allocateSlug } = require("../slugs");

async function clearInvalidLocations() {
  const result = await Restaurant.collection.updateMany(
    {
      location: { $exists: true },
      $or: [
        { "location.coordinates": { $exists: false } },
        { "location.coordinates": null },
        { "location.coordinates": { $size: 0 } },
        {
          "location.coordinates": {
            $not: { $type: "array" },
          },
        },
      ],
    },
    { $unset: { location: "" } }
  );
  console.log(
    `Cleared invalid location on ${result.modifiedCount} restaurant(s)`
  );
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await clearInvalidLocations();

  const missing = await Restaurant.find({
    $or: [{ slug: null }, { slug: { $exists: false } }, { slug: "" }],
  })
    .select("_id name")
    .lean();

  console.log(`Restaurants missing slug: ${missing.length}`);

  for (const r of missing) {
    const slug = await allocateSlug(Restaurant, r.name, { excludeId: r._id });
    // $set slug only — avoids Mongoose re-applying location defaults on save
    await Restaurant.collection.updateOne(
      { _id: r._id },
      { $set: { slug, updatedAt: new Date() } }
    );
    console.log(`  ${r.name} → ${slug}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
