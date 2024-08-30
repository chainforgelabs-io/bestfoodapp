const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware"); // Import the protect middleware

// Create a new review (Protected: Only authenticated users can create reviews)
router.post("/", protect, async (req, res) => {
  try {
    const { restaurantId, foodItem, score, ambianceRating, comment, photos } =
      req.body;

    const review = new Review({
      userId: req.user.id, // Use the authenticated user's ID from protect middleware
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

// Get all reviews (Public: Anyone can view reviews)
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find().populate("foodItem");
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single review by ID (Public: Anyone can view a review)
router.get("/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate("foodItem");
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.status(200).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a review by ID (Protected: Only the authenticated user who created the review can update it)
router.put("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    const { ambianceRating, comment } = req.body;
    review.ambianceRating = ambianceRating || review.ambianceRating;
    review.comment = comment || review.comment;

    const updatedReview = await review.save();
    res.status(200).json(updatedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a review by ID (Protected: Only the authenticated user who created the review can delete it)
router.delete("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    await review.remove();
    res.status(200).json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
