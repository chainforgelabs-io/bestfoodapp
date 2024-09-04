const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const Restaurant = require("../models/Restaurant");
const { protect } = require("../middleware/authMiddleware"); // Import the protect middleware

// Define the weights for different food categories
const categoryWeights = {
  Mains: 0.35,
  Burgers: 0.2,
  "Sandwiches/Handhelds": 0.15,
  "Deep-Fried": 0.1,
  Appetizers: 0.075,
  Sides: 0.05,
  Desserts: 0.05,
  Drinks: 0.025,
};

// Create a new restaurant (Protected: Only authenticated users can create restaurants)
router.post("/", protect, async (req, res) => {
  try {
    const { name, address, type, cuisine, ambiance } = req.body;
    const restaurant = new Restaurant({
      name,
      address,
      type,
      cuisine,
      ambiance,
      createdBy: req.user._id, // Add this line to set the creator
    });
    const savedRestaurant = await restaurant.save();
    res.status(201).json(savedRestaurant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all restaurants (Public: Anyone can view restaurants)
router.get("/", async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate("address");
    res.status(200).json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single restaurant by ID (Public: Anyone can view a restaurant)
router.get("/:id", async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "address"
    );
    if (!restaurant)
      return res.status(404).json({ message: "Restaurant not found" });
    res.status(200).json(restaurant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get the overall score for a specific restaurant (Public: Anyone can view the overall score for a restaurant)
router.get("/:id/score", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the restaurant by ID to ensure it exists
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Step 1: Find all food items associated with this restaurant
    const foodItems = await FoodItem.find({ restaurant: id });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: "No food items found for this restaurant" });
    }

    // Step 2: Calculate the weighted average score for the restaurant
    let weightedSum = 0;
    let totalWeight = 0;

    for (let foodItem of foodItems) {
      const reviews = await Review.find({ foodItem: foodItem._id });

      if (reviews.length > 0) {
        const averageScore =
          reviews.reduce((sum, review) => sum + review.score, 0) /
          reviews.length;
        const categoryWeight = categoryWeights[foodItem.category] || 0; // Use the weight for the item's category
        weightedSum += averageScore * categoryWeight;
        totalWeight += categoryWeight;
      }
    }

    // Calculate the overall score using the weighted sum
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Return the restaurant ID and the calculated overall score
    res.status(200).json({ restaurant: id, overallScore });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all reviews for a restaurant (Public: Anyone can view reviews)
router.get("/:id/reviews", async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Step 1: Find all food items associated with this restaurant
    const foodItems = await FoodItem.find({ restaurant: restaurantId });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: "No food items found for this restaurant" });
    }

    // Step 2: Get all reviews for the food items
    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: "No reviews found for this restaurant" });
    }

    // Step 3: Respond with all the reviews
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Filter restaurants by ambiance (Public: Anyone can filter restaurants)
router.get("/filter", async (req, res) => {
  try {
    const { ambiance } = req.query;
    const restaurants = await Restaurant.find({
      ambiance: { $in: ambiance },
    }).populate("address");
    res.status(200).json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a restaurant by ID (Protected: Only authenticated users can update a restaurant)
router.put("/:id", protect, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ msg: "Restaurant not found" });

    // Ensure the user trying to update the restaurant is the creator
    if (restaurant.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Unauthorized action" });
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json(updatedRestaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Delete a restaurant by ID (Protected: Only the creator can delete the restaurant)
router.delete("/:id", protect, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ msg: "Restaurant not found" });

    // Ensure the user trying to delete the restaurant is the creator
    if (restaurant.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Unauthorized action" });
    }

    // Use deleteOne instead of remove
    await restaurant.deleteOne();
    res.status(200).json({ msg: "Restaurant deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
