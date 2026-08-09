const mongoose = require("mongoose");

const proposedItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true },
    subType: { type: String },
    price: { type: Number },
    sizeOptions: {
      type: String,
      enum: ["", "small", "medium", "large", "extra large"],
      default: "",
    },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

const existingSnapshotSchema = new mongoose.Schema(
  {
    name: String,
    category: String,
    type: String,
    subType: String,
    price: Number,
    sizeOptions: String,
    tags: [String],
  },
  { _id: false }
);

const menuImportChangeSchema = new mongoose.Schema({
  menuImport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuImport",
    required: true,
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  action: {
    type: String,
    enum: ["add", "update"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  matchedFoodItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FoodItem",
  },
  proposed: {
    type: proposedItemSchema,
    required: true,
  },
  existing: {
    type: existingSnapshotSchema,
  },
  sourceImageKeys: {
    type: [String],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

menuImportChangeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

menuImportChangeSchema.index({ status: 1, createdAt: -1 });
menuImportChangeSchema.index({ restaurant: 1, status: 1 });

module.exports = mongoose.model("MenuImportChange", menuImportChangeSchema);
