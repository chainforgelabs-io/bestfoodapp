const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  type: { type: String, required: true }, // E.g., Sandwich, Sushi
  name: { type: String, required: true },
  price: { type: Number, required: false }, // Optional in case some items don’t have a price listed
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FoodItem", foodItemSchema);
