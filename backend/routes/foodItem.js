const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware"); // Import the protect middleware

// Create a new food item (Protected: Only authenticated users can create food items)
router.post("/", protect, async (req, res) => {
  try {
    const { name, type, subType, cuisine, price, restaurant } = req.body;

    // Create a new FoodItem instance
    const foodItem = new FoodItem({
      name,
      type, // General type/category of food (e.g., Burger, Pizza)
      subType, // Specific variation (e.g., Cheese Burger, Pepperoni Pizza)
      cuisine, // Cuisine type (e.g., American, Italian, Mexican)
      price,
      restaurant,
      createdBy: req.user._id, // Set the creator's ID
    });

    // Save the food item to the database
    const savedFoodItem = await foodItem.save();

    res.status(201).json(savedFoodItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get all food items (Public: Anyone can view food items)
router.get("/", async (req, res) => {
  try {
    const foodItems = await FoodItem.find().populate("restaurant");
    res.status(200).json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single food item by ID (Public: Anyone can view a food item)
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

// Get all food items from restaurant id (Public: Anyone can view food items by restaurant)
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

// Get the average and current score of a food item (Public: Anyone can view scores of a food item)
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

// Update a food item by ID (Protected: Only authenticated users can update a food item)
router.put("/:id", protect, async (req, res) => {
  try {
    // Find the food item by ID
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem)
      return res.status(404).json({ message: "Food item not found" });

    // Ensure the user trying to update the food item is the creator
    if (foodItem.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Unauthorized action" });
    }

    // Update the food item with the new data
    const updatedFoodItem = await FoodItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedFoodItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a food item by ID (Protected: Only authenticated users can delete a food item)
router.delete("/:id", protect, async (req, res) => {
  try {
    // Find the food item by ID
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem)
      return res.status(404).json({ message: "Food item not found" });

    // Ensure the user trying to delete the food item is the creator
    if (foodItem.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Unauthorized action" });
    }

    // Delete the food item
    await foodItem.deleteOne();
    res.status(200).json({ message: "Food item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
