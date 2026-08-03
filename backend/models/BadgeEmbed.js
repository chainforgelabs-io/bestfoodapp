const mongoose = require("mongoose");

const badgeEmbedSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
    index: true,
  },
  detectedUrl: { type: String, required: true },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  isLive: { type: Boolean, default: true },
});

badgeEmbedSchema.index({ restaurantId: 1, detectedUrl: 1 }, { unique: true });

module.exports = mongoose.model("BadgeEmbed", badgeEmbedSchema);
