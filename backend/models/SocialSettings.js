const mongoose = require("mongoose");

const DEFAULT_CAPTION_TEMPLATE =
  "{itemName} from {restaurantName} — scored {score}. Reviewed {date}.\nMore reviews + your favorites at bestfoodapp.com";

// Prior seeded defaults that should be auto-upgraded to the current default if
// the admin never customized them (preserves real customizations).
const LEGACY_DEFAULT_TEMPLATES = [
  "{itemName} from {restaurantName} — scored {score}/100. Reviewed {date}.\nMore reviews + your favorites at bestfoodapp.com",
];

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
    enum: ["instagram", "x", "facebook"],
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
  } else if (LEGACY_DEFAULT_TEMPLATES.includes(doc.captionTemplate)) {
    doc.captionTemplate = DEFAULT_CAPTION_TEMPLATE;
    await doc.save();
  }
  return doc;
};

module.exports = mongoose.model("SocialSettings", socialSettingsSchema);
module.exports.DEFAULT_CAPTION_TEMPLATE = DEFAULT_CAPTION_TEMPLATE;
