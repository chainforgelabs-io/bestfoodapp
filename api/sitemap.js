/**
 * Dynamic /sitemap.xml — restaurants with reviews only (never places).
 */

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
let cached = global._mongooseSitemap;
if (!cached) cached = global._mongooseSitemap = { conn: null, promise: null };

async function connectDB() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
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

module.exports = async function handler(req, res) {
  try {
    await connectDB();
    const { buildSitemapXml } = require("../backend/lib/seo/sitemap");
    const xml = await buildSitemapXml();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.end(xml);
  } catch (err) {
    console.error("sitemap error", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.end(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    );
  }
};
