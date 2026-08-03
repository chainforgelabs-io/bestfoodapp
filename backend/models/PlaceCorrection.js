const mongoose = require("mongoose");

/**
 * Learned rules from admin batch edits. Applied by normalize/dedupe/assign
 * on subsequent imports.
 */
const placeCorrectionSchema = new mongoose.Schema({
  ruleType: {
    type: String,
    enum: [
      "name_normalize",
      "cuisine_hint",
      "city_reassign",
      "dedupe_merge",
      "dedupe_keep_separate",
      "dismiss",
      "field_override",
    ],
    required: true,
    index: true,
  },
  match: {
    nameRaw: { type: String, default: null },
    nameNormalized: { type: String, default: null },
    gersId: { type: String, default: null },
    sourceCategory: { type: String, default: null },
    locality: { type: String, default: null },
  },
  action: { type: Object, default: {} },
  batchId: { type: String, default: null },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

placeCorrectionSchema.index({ "match.nameNormalized": 1, ruleType: 1 });
placeCorrectionSchema.index({ "match.sourceCategory": 1, ruleType: 1 });

module.exports = mongoose.model("PlaceCorrection", placeCorrectionSchema);
