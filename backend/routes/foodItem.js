const express = require("express");
const router = express.Router();
const FoodItem = require("../models/FoodItem");

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
