const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    imageKey: { type: String, required: true },
    imageBucket: { type: String, required: true },
    imageHash: { type: String, index: true },
    purchaseDate: { type: Date },
    totalAmount: { type: Number },
    subtotal: { type: Number },
    tax: { type: Number },
    tip: { type: Number },
    currency: { type: String },
    rawOcrJson: { type: mongoose.Schema.Types.Mixed },
    parsedJson: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["pending", "confirmed", "discarded"],
      default: "pending",
    },
    reviewIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
    ],
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
