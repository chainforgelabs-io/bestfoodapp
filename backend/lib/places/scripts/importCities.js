#!/usr/bin/env node
/**
 * Local one-off: StatCan CSD GeoJSON → cities collection.
 * Usage:
 *   MONGODB_URI=... node backend/lib/places/scripts/importCities.js [--file=path]
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

const City = require("../../../models/City");
const { slugify } = require("../../seo/slugs");

const PROVINCE_NAMES = {
  "10": "Newfoundland and Labrador",
  "11": "Prince Edward Island",
  "12": "Nova Scotia",
  "13": "New Brunswick",
  "24": "Quebec",
  "35": "Ontario",
  "46": "Manitoba",
  "47": "Saskatchewan",
  "48": "Alberta",
  "59": "British Columbia",
  "60": "Yukon",
  "61": "Northwest Territories",
  "62": "Nunavut",
};

const PROVINCE_CODES = {
  "10": "NL",
  "11": "PE",
  "12": "NS",
  "13": "NB",
  "24": "QC",
  "35": "ON",
  "46": "MB",
  "47": "SK",
  "48": "AB",
  "59": "BC",
  "60": "YT",
  "61": "NT",
  "62": "NU",
};

const NON_PUBLISHABLE = new Set([
  "RM",
  "NO",
  "UNP",
  "S-É",
  "SRI",
  "RCR",
  "IDR",
  "IRI",
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    file: path.join(__dirname, "../data/csd-2021.geojson"),
  };
  for (const a of args) {
    if (a.startsWith("--file=")) out.file = a.slice(7);
  }
  return out;
}

function centroidOf(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Point") return geometry.coordinates;
  const coords = [];
  const walk = (c) => {
    if (typeof c[0] === "number") coords.push(c);
    else c.forEach(walk);
  };
  walk(geometry.coordinates || []);
  if (!coords.length) return null;
  let lng = 0;
  let lat = 0;
  for (const [x, y] of coords) {
    lng += x;
    lat += y;
  }
  return [lng / coords.length, lat / coords.length];
}

function simplifyRing(ring, step = 4) {
  if (!Array.isArray(ring) || ring.length < 10) return ring;
  const out = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  const last = ring[ring.length - 1];
  const end = out[out.length - 1];
  if (!end || end[0] !== last[0] || end[1] !== last[1]) out.push(last);
  return out;
}

function simplifyGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => simplifyRing(ring))
      ),
    };
  }
  return geometry;
}

async function main() {
  const { file } = parseArgs();
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI required");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    console.error("See backend/lib/places/data/README.md");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const features = raw.features || [];
  console.log(`Loaded ${features.length} features from ${file}`);

  await mongoose.connect(process.env.MONGODB_URI);

  // Track slug → csdUid so collisions (e.g. many "Victoria") get unique suffixes,
  // including against rows already written by a prior partial import.
  const slugOwner = new Map();
  const existing = await City.find({ countryCode: "ca" })
    .select("csdUid slug")
    .lean();
  for (const row of existing) {
    if (row.slug && row.csdUid) slugOwner.set(row.slug, String(row.csdUid));
  }

  function allocateCitySlug(name, province, csdUid) {
    const base = slugify(name) || `csd-${csdUid}`;
    const prov = String(province || "xx").toLowerCase();
    const candidates = [base, `${base}-${prov}`, `${base}-${prov}-${csdUid}`];
    for (const candidate of candidates) {
      const owner = slugOwner.get(candidate);
      if (!owner || owner === csdUid) {
        slugOwner.set(candidate, csdUid);
        return candidate;
      }
    }
    for (let n = 2; n < 1000; n += 1) {
      const candidate = `${base}-${prov}-${n}`;
      const owner = slugOwner.get(candidate);
      if (!owner || owner === csdUid) {
        slugOwner.set(candidate, csdUid);
        return candidate;
      }
    }
    throw new Error(`slug_collision_exhausted:${base}:${csdUid}`);
  }

  let upserts = 0;

  for (const feature of features) {
    const p = feature.properties || {};
    const csdUid = String(
      p.CSDUID || p.csduid || p.DGUID || p.dguid || p.uid || ""
    ).replace(/\D/g, "").slice(-7);
    if (!csdUid || csdUid.length < 7) continue;

    const name = p.CSDNAME || p.csdname || p.NAME || p.name || "";
    if (!name) continue;

    const pruid = String(p.PRUID || p.pruid || csdUid.slice(0, 2));
    const province = PROVINCE_CODES[pruid] || p.PR || "XX";
    const provinceName = PROVINCE_NAMES[pruid] || p.PRNAME || province;
    const csdType = p.CSDTYPE || p.csdtype || p.TYPE || "";
    const population = Number(p.POPULATION || p.population || p.CSD_POP || 0) || 0;
    const centroid = centroidOf(feature.geometry);
    const citySlug = allocateCitySlug(name, province, csdUid);

    const isPublishable = !NON_PUBLISHABLE.has(String(csdType).toUpperCase());

    await City.findOneAndUpdate(
      { csdUid },
      {
        $set: {
          csdUid,
          name,
          slug: citySlug,
          csdType,
          province,
          provinceName,
          countryCode: "ca",
          population,
          centroid: centroid
            ? { type: "Point", coordinates: centroid }
            : undefined,
          boundarySimplified: simplifyGeometry(feature.geometry),
          isPublishable,
          censusYear: 2025,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    upserts += 1;
  }

  const saskatoon = await City.findOne({ slug: "saskatoon" }).lean();
  const regina = await City.findOne({ slug: "regina" }).lean();
  console.log("Upserts:", upserts);
  console.log(
    "Smoke saskatoon:",
    saskatoon
      ? `${saskatoon.csdUid} pop=${saskatoon.population}`
      : "MISSING"
  );
  console.log(
    "Smoke regina:",
    regina ? `${regina.csdUid} pop=${regina.population}` : "MISSING"
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
