const mongoose = require("mongoose");

/**
 * Admin-created food taxonomy values that extend the static lists in
 * frontend standardizedOptions / backend lib/menu/taxonomy.
 *
 * kind=category → parent unused
 * kind=type → parent is category name
 * kind=subType → parent is type name
 */
const foodTaxonomyOptionSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ["category", "type", "subType"],
    required: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  /** Normalized lowercase value for uniqueness checks */
  valueKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  parent: {
    type: String,
    default: "",
    trim: true,
  },
  parentKey: {
    type: String,
    default: "",
    trim: true,
    lowercase: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

foodTaxonomyOptionSchema.index(
  { kind: 1, parentKey: 1, valueKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("FoodTaxonomyOption", foodTaxonomyOptionSchema);
