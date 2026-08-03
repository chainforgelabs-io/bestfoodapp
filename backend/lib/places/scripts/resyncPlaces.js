#!/usr/bin/env node
/**
 * Monthly Overture resync: write a diff report; do NOT auto-apply.
 *
 * Usage:
 *   MONGODB_URI=... node backend/lib/places/scripts/resyncPlaces.js \
 *     --file=backend/lib/places/data/sk-places.geojson \
 *     --release=2026-08-01.0 \
 *     --out=backend/lib/places/data/resync-report.json
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

const Place = require("../../../models/Place");
const PlaceCorrection = require("../../../models/PlaceCorrection");
const {
  normalizePlace,
  isEatAndDrinkCategory,
} = require("../normalize");

function parseArgs() {
  const out = {
    file: null,
    release: "unknown",
    out: path.join(__dirname, "../data/resync-report.json"),
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--file=")) out.file = a.slice(7);
    else if (a.startsWith("--release=")) out.release = a.slice(10);
    else if (a.startsWith("--out=")) out.out = a.slice(6);
  }
  return out;
}

async function main() {
  const args = parseArgs();
  if (!process.env.MONGODB_URI || !args.file) {
    console.error("MONGODB_URI and --file= required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const corrections = await PlaceCorrection.find({}).lean();
  const raw = JSON.parse(fs.readFileSync(args.file, "utf8"));
  const features = raw.features || [];

  const incoming = new Map();
  for (const feature of features) {
    const props = feature.properties || feature;
    const n = normalizePlace(
      { ...props, geometry: feature.geometry, id: props.id || feature.id },
      { corrections }
    );
    if (!n.gersId || !isEatAndDrinkCategory(n.sourceCategory)) continue;
    incoming.set(n.gersId, n);
  }

  const existing = await Place.find({}).select("gersId name status restaurantId").lean();
  const existingMap = new Map(existing.map((p) => [p.gersId, p]));

  const report = {
    release: args.release,
    generatedAt: new Date().toISOString(),
    newPlaces: [],
    changed: [],
    disappeared: [],
    notes:
      "Review this report before applying. Never overwrite fields on promoted records.",
  };

  for (const [gersId, n] of incoming) {
    const ex = existingMap.get(gersId);
    if (!ex) {
      report.newPlaces.push({ gersId, name: n.name });
    } else if (ex.name !== n.name && ex.status !== "promoted") {
      report.changed.push({
        gersId,
        from: { name: ex.name },
        to: { name: n.name },
      });
    }
  }

  for (const ex of existing) {
    if (!incoming.has(ex.gersId) && ex.status !== "promoted") {
      report.disappeared.push({
        gersId: ex.gersId,
        name: ex.name,
        suggestedStatus: "stale",
      });
    }
  }

  fs.writeFileSync(args.out, JSON.stringify(report, null, 2));

  // Surface summary in /admin/places (full lists truncated for Mongo doc size)
  const PlacesSettings = require("../../../models/PlacesSettings");
  const settings = await PlacesSettings.getOrCreate();
  settings.lastResyncReport = {
    release: report.release,
    generatedAt: report.generatedAt,
    notes: report.notes,
    counts: {
      new: report.newPlaces.length,
      changed: report.changed.length,
      disappeared: report.disappeared.length,
    },
    sampleNew: report.newPlaces.slice(0, 25),
    sampleChanged: report.changed.slice(0, 25),
    sampleDisappeared: report.disappeared.slice(0, 25),
    reportPath: args.out,
  };
  settings.lastResyncAt = new Date();
  settings.updatedAt = new Date();
  await settings.save();

  console.log(`Wrote report: ${args.out}`);
  console.log(
    `new=${report.newPlaces.length} changed=${report.changed.length} disappeared=${report.disappeared.length}`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
