const mongoose = require("mongoose");

const seoAuditResultSchema = new mongoose.Schema({
  job: {
    type: String,
    enum: ["indexAudit", "embedCrawl", "refreshAudit"],
    required: true,
    index: true,
  },
  ranAt: { type: Date, default: Date.now, index: true },
  summary: { type: Object, default: {} },
  items: { type: [Object], default: [] },
});

module.exports = mongoose.model("SeoAuditResult", seoAuditResultSchema);
