const mongoose = require("mongoose");

/**
 * Seed pool of venues from Overture. Never appears in sitemaps or public pages
 * until promoted to Restaurant via a published review.
 */
const placeSchema = new mongoose.Schema({
  gersId: { type: String, required: true, unique: true, index: true },
  gersIds: { type: [String], default: [] },
  name: { type: String, required: true, index: true },
  nameRaw: { type: String, required: true },
  unitLabel: { type: String, default: null },
  brandName: { type: String, default: null },
  address: {
    freeform: { type: String, default: "" },
    street: { type: String, default: "" },
    locality: { type: String, default: "" },
    region: { type: String, default: "" },
    postcode: { type: String, default: "" },
    country: { type: String, default: "CA" },
  },
  // Only set when coordinates exist — bare { type: "Point" } breaks 2dsphere.
  location: {
    type: { type: String, enum: ["Point"] },
    coordinates: { type: [Number] },
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    default: null,
    index: true,
  },
  csdUid: { type: String, default: null },
  cityAssignment: {
    type: String,
    enum: ["within", "nearest", "unassigned", "pending"],
    default: "pending",
  },
  website: { type: String, default: null },
  phone: { type: String, default: null },
  sourceCategory: { type: String, default: null },
  cuisineHint: { type: String, default: null },
  confidence: { type: Number, default: null },
  licenseClass: {
    type: String,
    enum: ["cdla", "odbl"],
    default: "cdla",
  },
  status: {
    type: String,
    enum: [
      "pending_review",
      "active",
      "low_confidence",
      "suspect_duplicate",
      "promoted",
      "dismissed",
      "stale",
    ],
    default: "pending_review",
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    default: null,
  },
  batchId: { type: String, default: null, index: true },
  sourceRelease: { type: String, default: null },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ name: "text" });
placeSchema.index({ batchId: 1, status: 1 });

module.exports = mongoose.model("Place", placeSchema);
