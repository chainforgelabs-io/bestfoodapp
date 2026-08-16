const mongoose = require("mongoose");
const { normalizeAddressFields } = require("../lib/places/addressNormalize");

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  province: { type: String },
  country: { type: String, required: true },
  postalCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

addressSchema.pre("save", function normalizeAddress(next) {
  const normalized = normalizeAddressFields(this);
  this.street = normalized.street;
  this.city = normalized.city;
  this.province = normalized.province;
  this.country = normalized.country;
  this.postalCode = normalized.postalCode;
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Address", addressSchema);
