const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  type: { type: String, required: true }, // E.g., Catering, Casual Dining
  cuisine: { type: [String], required: true }, // E.g., Japanese, American
  ambiance: [{ type: String }], // New field for ambiance/setting
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // SEO / places integration
  slug: { type: String, unique: true, sparse: true, index: true },
  slugLockedAt: { type: Date, default: null },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    default: null,
    index: true,
  },
  gersId: { type: String, sparse: true, unique: true, index: true },
  brandName: { type: String, default: null }, // chain grouping later; one record per location
  countryCode: { type: String, default: "ca" },
  website: { type: String, default: null },
  menuTodoSkippedAt: { type: Date, default: null },
  // Only set when coordinates exist — bare { type: "Point" } breaks 2dsphere.
  location: {
    type: { type: String, enum: ["Point"] },
    coordinates: { type: [Number] },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

restaurantSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Restaurant", restaurantSchema);
