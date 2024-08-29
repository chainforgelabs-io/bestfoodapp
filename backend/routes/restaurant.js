const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const Restaurant = require("../models/Restaurant");

// Create a new restaurant
router.post("/", async (req, res) => {
  try {
    const { name, address, type, cuisine, ambiance } = req.body;
    const restaurant = new Restaurant({
      name,
      address,
      type,
      cuisine,
      ambiance,
    });
    const savedRestaurant = await restaurant.save();
    res.status(201).json(savedRestaurant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all restaurants
router.get("/", async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate("address");
    res.status(200).json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single restaurant by ID
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

// Get the overall score of a restaurant
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

// Get all reviews for a restaurant
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

// Filter restaurants by ambiance
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

// Update a restaurant by ID
router.put("/:id", async (req, res) => {
  try {
    const { ambiance } = req.body;
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { ambiance },
      { new: true }
    );
    if (!updatedRestaurant)
      return res.status(404).json({ message: "Restaurant not found" });
    res.status(200).json(updatedRestaurant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a restaurant by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedRestaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!deletedRestaurant)
      return res.status(404).json({ message: "Restaurant not found" });
    res.status(200).json({ message: "Restaurant deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
