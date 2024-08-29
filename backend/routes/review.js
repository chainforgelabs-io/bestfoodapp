const express = require("express");
const router = express.Router();
const Review = require("../models/Review");

// Create a new review
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      restaurantId,
      foodItem,
      score,
      ambianceRating,
      comment,
      photos,
    } = req.body;
    const review = new Review({
      userId,
      restaurantId,
      foodItem,
      score,
      ambianceRating,
      comment,
      photos,
    });
    const savedReview = await review.save();
    res.status(201).json(savedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all reviews
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find().populate("foodItem");
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single review by ID
router.get("/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate("foodItem");
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.status(200).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a review by ID
router.put("/:id", async (req, res) => {
  try {
    const { ambianceRating } = req.body;
    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      { ambianceRating },
      { new: true }
    );
    if (!updatedReview)
      return res.status(404).json({ message: "Review not found" });
    res.status(200).json(updatedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a review by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedReview = await Review.findByIdAndDelete(req.params.id);
    if (!deletedReview)
      return res.status(404).json({ message: "Review not found" });
    res.status(200).json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
