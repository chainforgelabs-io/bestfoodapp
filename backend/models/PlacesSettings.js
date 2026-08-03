const mongoose = require("mongoose");

const placesSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "default", unique: true },
  autopilotEnabled: { type: Boolean, default: false },
  autopilotMinBatches: { type: Number, default: 3 },
  autopilotMaxEditRate: { type: Number, default: 0.02 },
  /** Latest monthly Overture resync diff (never auto-applied). */
  lastResyncReport: { type: Object, default: null },
  lastResyncAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
});

placesSettingsSchema.statics.getOrCreate = async function getOrCreate() {
  let doc = await this.findOne({ key: "default" });
  if (!doc) {
    doc = await this.create({ key: "default" });
  }
  return doc;
};

module.exports = mongoose.model("PlacesSettings", placesSettingsSchema);
