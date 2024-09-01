const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware"); // Import the protect middleware

// Create a new review (Protected: Only authenticated users can create reviews)
// Create a new review (Protected: Only authenticated users can create reviews)
router.post("/", protect, async (req, res) => {
  try {
    const { restaurantId, foodItem, score, ambianceRating, comment, photos } =
      req.body;

    // Ensure the score is between 0 and 100
    if (score < 0 || score > 100) {
      return res
        .status(400)
        .json({ message: "Score must be between 0 and 100" });
    }

    // Create a new review instance
    const review = new Review({
      userId: req.user.id, // Use the authenticated user's ID from protect middleware
      restaurantId,
      foodItem,
      score,
      ambianceRating,
      comment,
      photos,
    });

    // Save the review to the database
    const savedReview = await review.save();

    // Calculate points based on the review
    let pointsEarned = 1; // 1 point for the review
    if (comment) pointsEarned += 1; // 1 additional point for a comment
    if (photos && photos.length > 0) pointsEarned += 1; // 1 additional point for photos

    // Update the user's points and add the review to the user's reviews array
    const user = await User.findById(req.user.id);
    user.points += pointsEarned;
    user.reviews.push(savedReview._id);
    await user.save();

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

// Get all reviews for a specific food item (Public: Anyone can view reviews)
router.get("/food-item/:foodItemId", async (req, res) => {
  try {
    const reviews = await Review.find({
      foodItem: req.params.foodItemId,
    }).populate("userId", "username");
    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: "No reviews found for this food item" });
    }
    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
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
// Delete a review by ID (Protected: Only the review owner can delete their review)
router.delete("/:id", protect, async (req, res) => {
  try {
    // Find the review by ID
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if the logged-in user is the owner of the review
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Delete the review
    await review.deleteOne();
    res.status(200).json({ message: "Review deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
