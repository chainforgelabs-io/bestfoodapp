const mongoose = require("mongoose");

const seoJobSchema = new mongoose.Schema({
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
    default: null,
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    default: null,
  },
  step: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed", "skipped"],
    default: "pending",
    index: true,
  },
  error: { type: String, default: null },
  result: { type: Object, default: null },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

seoJobSchema.index({ reviewId: 1, step: 1 });

module.exports = mongoose.model("SeoJob", seoJobSchema);
