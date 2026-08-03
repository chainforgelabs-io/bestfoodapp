/**
 * Daily dispatcher for SEO maintenance jobs (fits Vercel Hobby 2-cron limit).
 * - Weekly indexAudit (Sunday)
 * - Weekly embedCrawl (Wednesday)
 * - Monthly refreshAudit (1st of month)
 */

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  const mongoose = require("mongoose");
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    return res.status(500).json({ message: "MONGODB_URI missing" });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      });
    }

    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun
    const date = now.getUTCDate();
    const ran = [];

    if (day === 0) {
      const { runIndexAudit } = require("../../backend/lib/seo/jobs/indexAudit");
      ran.push({ job: "indexAudit", result: await runIndexAudit() });
    }
    if (day === 3) {
      const { runEmbedCrawl } = require("../../backend/lib/seo/jobs/embedCrawl");
      ran.push({ job: "embedCrawl", result: await runEmbedCrawl() });
    }
    if (date === 1) {
      const {
        runRefreshAudit,
      } = require("../../backend/lib/seo/jobs/refreshAudit");
      ran.push({ job: "refreshAudit", result: await runRefreshAudit() });
    }

    if (ran.length === 0) {
      ran.push({ job: "noop", result: { message: "No jobs scheduled today" } });
    }

    return res.status(200).json({ ok: true, ranAt: now.toISOString(), ran });
  } catch (err) {
    console.error("seo-maintenance cron", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};
