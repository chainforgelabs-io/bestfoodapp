const mongoose = require("mongoose");

const DEFAULT_CAPTION_TEMPLATE =
  "{itemName} from {restaurantName} — scored {score}/100. Reviewed {date}.\nMore reviews + your favorites at bestfoodapp.com";

const socialSettingsSchema = new mongoose.Schema({
  singletonKey: {
    type: String,
    default: "default",
    unique: true,
  },
  captionTemplate: {
    type: String,
    default: DEFAULT_CAPTION_TEMPLATE,
  },
  stagingThreshold: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  defaultPlatforms: {
    type: [String],
    enum: ["instagram", "x"],
    default: ["instagram"],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

socialSettingsSchema.statics.getOrCreate = async function getOrCreate() {
  let doc = await this.findOne({ singletonKey: "default" });
  if (!doc) {
    doc = await this.create({
      singletonKey: "default",
      captionTemplate: DEFAULT_CAPTION_TEMPLATE,
      stagingThreshold: 70,
      defaultPlatforms: ["instagram"],
    });
  }
  return doc;
};

module.exports = mongoose.model("SocialSettings", socialSettingsSchema);
module.exports.DEFAULT_CAPTION_TEMPLATE = DEFAULT_CAPTION_TEMPLATE;
