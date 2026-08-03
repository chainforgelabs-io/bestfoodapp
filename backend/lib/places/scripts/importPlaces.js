#!/usr/bin/env node
/**
 * Local batch import: Overture GeoJSON → places (pending_review).
 *
 * Usage:
 *   MONGODB_URI=... node backend/lib/places/scripts/importPlaces.js \
 *     --file=backend/lib/places/data/sk-places.geojson \
 *     --batch=saskatoon \
 *     --city=saskatoon \
 *     --release=2026-07-23.0
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

const Place = require("../../../models/Place");
const City = require("../../../models/City");
const PlaceBatch = require("../../../models/PlaceBatch");
const PlaceCorrection = require("../../../models/PlaceCorrection");
const PlaceReviewQueue = require("../../../models/PlaceReviewQueue");
const PlacesSettings = require("../../../models/PlacesSettings");
const {
  normalizePlace,
  isEatAndDrinkCategory,
} = require("../normalize");
const { assignCity } = require("../assign");
const { dedupeBatch } = require("../dedupe");

function parseArgs() {
  const out = {
    file: null,
    batch: null,
    city: null,
    province: "SK",
    release: "unknown",
    limit: 0,
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--file=")) out.file = a.slice(7);
    else if (a.startsWith("--batch=")) out.batch = a.slice(8);
    else if (a.startsWith("--city=")) out.city = a.slice(7);
    else if (a.startsWith("--province=")) out.province = a.slice(11);
    else if (a.startsWith("--release=")) out.release = a.slice(10);
    else if (a.startsWith("--limit=")) out.limit = parseInt(a.slice(8), 10);
  }
  return out;
}

async function loadFeatures(file) {
  const text = fs.readFileSync(file, "utf8");
  // Support FeatureCollection or NDJSON
  if (text.trim().startsWith("{")) {
    const json = JSON.parse(text);
    if (json.type === "FeatureCollection") return json.features || [];
    if (json.type === "Feature") return [json];
  }
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((l) => JSON.parse(l));
}

async function main() {
  const args = parseArgs();
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI required");
    process.exit(1);
  }
  if (!args.file || !args.batch) {
    console.error("Required: --file=... --batch=...");
    process.exit(1);
  }
  if (!fs.existsSync(args.file)) {
    console.error("File not found:", args.file);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const cities = await City.find({ countryCode: "ca" }).lean();
  const corrections = await PlaceCorrection.find({}).lean();
  const settings = await PlacesSettings.getOrCreate();

  let features = await loadFeatures(args.file);
  console.log(`Loaded ${features.length} features`);

  let normalized = [];
  for (const feature of features) {
    const props = feature.properties || feature;
    const raw = {
      ...props,
      geometry: feature.geometry || props.geometry,
      id: props.id || feature.id,
    };
    const n = normalizePlace(raw, { corrections });
    if (!n.gersId || !n.name) continue;
    // Require explicit eat/drink signal (category and/or taxonomy.hierarchy)
    if (!isEatAndDrinkCategory(n.sourceCategory, n.taxonomyHierarchy)) {
      continue;
    }
    if (args.city) {
      const loc = (n.address.locality || "").toLowerCase();
      if (loc && loc !== args.city.toLowerCase()) {
        // Still allow if point assigns to city later
      }
    }
    normalized.push(n);
  }

  if (args.city) {
    const cityDoc = cities.find((c) => c.slug === args.city);
    if (cityDoc) {
      normalized = normalized.filter((n) => {
        if (!n.location?.coordinates) return false;
        const a = assignCity(n.location.coordinates, cities);
        return String(a.cityId) === String(cityDoc._id);
      });
    }
  }

  if (args.limit > 0) normalized = normalized.slice(0, args.limit);

  console.log(`Normalized eat_and_drink candidates: ${normalized.length}`);
  if (args.city === "saskatoon" || args.batch === "saskatoon") {
    if (normalized.length < 300 || normalized.length > 1500) {
      console.warn(
        `WARNING: Saskatoon count ${normalized.length} outside 600–900 expected band (hard stop band <300 or >1500).`
      );
      if (normalized.length < 300 || normalized.length > 1500) {
        console.error("Aborting — check Overture category filter.");
        await mongoose.disconnect();
        process.exit(2);
      }
    }
  }

  const { kept, suspects } = dedupeBatch(normalized);
  console.log(`After dedupe: ${kept.length}; suspects: ${suspects.length}`);

  let upserts = 0;
  for (const n of kept) {
    const assignment = n.location?.coordinates
      ? assignCity(n.location.coordinates, cities)
      : { cityId: null, csdUid: null, cityAssignment: "unassigned" };

    const status =
      settings.autopilotEnabled && assignment.cityAssignment !== "unassigned"
        ? n.status === "low_confidence"
          ? "low_confidence"
          : "active"
        : n.status === "low_confidence"
          ? "low_confidence"
          : "pending_review";

    const { taxonomyHierarchy: _hier, ...placeFields } = n;
    await Place.findOneAndUpdate(
      { gersId: n.gersId },
      {
        $set: {
          ...placeFields,
          gersIds: n.gersIds || [n.gersId],
          cityId: assignment.cityId,
          csdUid: assignment.csdUid,
          cityAssignment: assignment.cityAssignment,
          status,
          batchId: args.batch,
          sourceRelease: args.release,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { firstSeenAt: new Date(), createdAt: new Date() },
      },
      { upsert: true }
    );
    upserts += 1;

    if (assignment.cityAssignment === "unassigned") {
      await PlaceReviewQueue.create({
        type: "unassigned_city",
        reason: "outside_publishable_city",
        payload: { gersId: n.gersId },
      });
    }
  }

  for (const s of suspects) {
    const place = await Place.findOne({ gersId: s.placeGersId });
    if (place) {
      place.status = "suspect_duplicate";
      await place.save();
      await PlaceReviewQueue.create({
        type: "duplicate",
        placeId: place._id,
        reason: s.reason,
        payload: s,
      });
    }
  }

  await PlaceBatch.findOneAndUpdate(
    { batchId: args.batch },
    {
      $set: {
        batchId: args.batch,
        label: args.city || args.batch,
        citySlug: args.city,
        province: args.province,
        status: settings.autopilotEnabled ? "autopilot" : "pending_review",
        totalRows: upserts,
        sourceRelease: args.release,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log(`Upserted ${upserts} places into batch ${args.batch}`);
  console.log(
    settings.autopilotEnabled
      ? "Autopilot ON — active status applied where possible"
      : "Autopilot OFF — places left as pending_review for admin confirmation"
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
