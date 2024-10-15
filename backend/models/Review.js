const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userRole: {
    type: String,
    required: true,
    enum: ["admin", "user"], // Limit to 'admin' and 'user' roles
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  foodItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FoodItem",
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  ambianceRating: {
    type: Number,
    min: 0,
    max: 5,
  },
  comment: {
    type: String,
  },
  photos: {
    type: [String], // Array of photo URLs or paths
  },
  tags: {
    type: [String], // Array of optional tags (e.g., ["spicy", "vegan"])
  },
  sizeOptions: {
    type: String,
    enum: ["small", "medium", "large", "extra large"], // Array of optional size options (e.g., ["small", "medium", "large"])
  },
  purchaseDate: {
    // Add this new field for the purchase date
    type: Date,
    required: true, // Set it as required if necessary
  },
  reviewDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Review", reviewSchema);
