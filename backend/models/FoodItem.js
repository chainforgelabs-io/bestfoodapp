const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  type: {
    type: String,
    required: true,
  }, // E.g., Burger, Pizza, Taco, Pasta (Category of food)
  subType: {
    type: String,
    required: false,
  }, // E.g., Cheese Burger, Pepperoni Pizza (Specific variation)
  cuisine: {
    type: String,
    required: true,
  }, // E.g., American, Italian, Mexican (Cuisine type)
  name: {
    type: String,
    required: true,
  }, // E.g., Beef Tacos, Cheese Burger (Name of the dish at this restaurant)
  price: {
    type: Number,
    required: false,
  }, // Optional in case some items don’t have a price listed
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
