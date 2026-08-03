const mongoose = require("mongoose");

const placeReviewQueueSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["duplicate", "reconcile", "unassigned_city", "schema_change"],
    required: true,
    index: true,
  },
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place",
    default: null,
  },
  candidateIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  reason: { type: String, default: "" },
  payload: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  resolution: { type: String, default: null },
});

placeReviewQueueSchema.index({ resolvedAt: 1, type: 1 });

module.exports = mongoose.model("PlaceReviewQueue", placeReviewQueueSchema);
