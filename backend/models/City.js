const mongoose = require("mongoose");

/**
 * Canonical geography from StatCan Census Subdivisions.
 * City URL segments derive from `slug` (immutable once used in locked restaurant URLs).
 */
const citySchema = new mongoose.Schema({
  csdUid: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, index: true },
  csdType: { type: String, default: "" },
  province: { type: String, required: true },
  provinceName: { type: String, required: true },
  countryCode: { type: String, default: "ca", index: true },
  population: { type: Number, default: 0 },
  centroid: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined },
  },
  boundarySimplified: { type: Object, default: null },
  isPublishable: { type: Boolean, default: true, index: true },
  censusYear: { type: Number, default: 2021 },
  slugLockedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

citySchema.index({ centroid: "2dsphere" });
citySchema.index({ countryCode: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model("City", citySchema);
