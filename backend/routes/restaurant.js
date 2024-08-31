const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const Restaurant = require("../models/Restaurant");
const protect = require("../middleware/authMiddleware"); // Import the protect middleware

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

// Get the overall score of a restaurant (Public: Anyone can view the score)
router.get("/:id/score", async (req, res) => {
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
        .json({ message: "No reviews found for this restaurant's food items" });
    }

    // Step 3: Calculate the average score from all the reviews
    const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
    const averageScore = totalScore / reviews.length;

    // Step 4: Respond with the average score
    res.json({ restaurantId, overallScore: averageScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
