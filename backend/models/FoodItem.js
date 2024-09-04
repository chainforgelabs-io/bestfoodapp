const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  // field to represent the "Menu Item Name"
  name: {
    type: String,
    required: true,
  },
  // field to represent the "Menu Item Category - ie. "Side", "Main", "Handheld", "Appetizer"
  category: {
    type: String,
    required: true,
  },
  // field to represent food type - ie. "Burger", "Fries", "Pizza", "Tacos"
  type: {
    type: String,
    required: true,
  },
  // field to represent food subtype - ie. "Cheese Burger", "Specialty Fries", "Cheese Pizza", "Chicken Tacos"
  subType: {
    type: String,
  },
  price: {
    type: Number,
  },
  adminScore: {
    type: Number,
    default: 0,
  },
  communityScore: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("FoodItem", foodItemSchema);
