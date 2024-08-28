const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");

// Create a new food item
router.post("/", async (req, res) => {
  try {
    const foodItem = new FoodItem(req.body);
    const savedFoodItem = await foodItem.save();
    res.status(201).json(savedFoodItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all food items
router.get("/", async (req, res) => {
  try {
    const foodItems = await FoodItem.find().populate("restaurant");
    res.status(200).json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single food item by ID
router.get("/:id", async (req, res) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id).populate(
      "restaurant"
    );
    if (!foodItem)
      return res.status(404).json({ message: "Food item not found" });
    res.status(200).json(foodItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all food items from restuarant id
router.get("/restaurant/:restaurantId", async (req, res) => {
  try {
    const foodItems = await FoodItem.find({
      restaurant: req.params.restaurantId,
    });
    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: "No food items found for this restaurant" });
    }
    res.json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get the average and current score of a food item
router.get("/:id/scores", async (req, res) => {
  try {
    const foodItemId = req.params.id;

    // Calculate the average score
    const avgResult = await Review.aggregate([
      { $match: { foodItem: new mongoose.Types.ObjectId(foodItemId) } },
      { $group: { _id: "$foodItem", averageScore: { $avg: "$score" } } },
    ]);

    // Retrieve the most recent review for the current score
    const latestReview = await Review.findOne({ foodItem: foodItemId }).sort({
      reviewDate: -1,
    });

    if (!avgResult.length || !latestReview) {
      return res
        .status(404)
        .json({ message: "No reviews found for this food item" });
    }

    const response = {
      foodItemId: foodItemId,
      averageScore: avgResult[0].averageScore,
      currentScore: latestReview.score,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a food item by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedFoodItem = await FoodItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedFoodItem)
      return res.status(404).json({ message: "Food item not found" });
    res.status(200).json(updatedFoodItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a food item by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedFoodItem = await FoodItem.findByIdAndDelete(req.params.id);
    if (!deletedFoodItem)
      return res.status(404).json({ message: "Food item not found" });
    res.status(200).json({ message: "Food item deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
