const mongoose = require("mongoose");

const menuImportImageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    imageBucket: { type: String, required: true },
    contentType: { type: String, default: "image/jpeg" },
  },
  { _id: false }
);

const menuImportSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  images: {
    type: [menuImportImageSchema],
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: "At least one image is required",
    },
  },
  status: {
    type: String,
    enum: ["uploaded", "scanning", "ready", "failed"],
    default: "uploaded",
  },
  rawAiJson: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

menuImportSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("MenuImport", menuImportSchema);
