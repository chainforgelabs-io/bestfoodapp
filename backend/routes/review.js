const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const FoodItem = require("../models/FoodItem");
const User = require("../models/User");
const Receipt = require("../models/Receipt");
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");
const moment = require("moment");

// Function to update food item scores
async function updateScores(foodItemId) {
  const reviews = await Review.find({ foodItem: foodItemId });

  if (reviews.length === 0) return;

  // Separate reviews into admin and community reviews
  const adminReviews = reviews.filter((review) => review.userRole === "admin");
  const communityReviews = reviews.filter(
    (review) => review.userRole !== "admin"
  );

  // Calculate the average score for admins
  const adminScore = adminReviews.length
    ? adminReviews.reduce((sum, review) => sum + review.score, 0) /
      adminReviews.length
    : 0;

  // Calculate the average score for community
  const communityScore = communityReviews.length
    ? communityReviews.reduce((sum, review) => sum + review.score, 0) /
      communityReviews.length
    : 0;

  // Update the food item with the new scores
  await FoodItem.findByIdAndUpdate(foodItemId, {
    adminScore,
    communityScore,
  });
}

// Create a new review (Protected: Only authenticated users can create reviews)
router.post("/", protect, async (req, res) => {
  try {
    const {
      restaurantId,
      foodItem,
      score,
      ambianceRating,
      comment,
      photos,
      tags,
      sizeOptions,
      purchaseDate,
      receiptId,
    } = req.body;

    // Ensure the score is between 0 and 100
    if (score < 0 || score > 100) {
      return res
        .status(400)
        .json({ message: "Score must be between 0 and 100" });
    }

    // Automatically set the userRole based on the authenticated user's role
    const userRole = req.user.role;

    // Ensure purchaseDate is in the correct format (mm-dd-yyyy)
    if (!moment(purchaseDate, "MM-DD-YYYY", true).isValid()) {
      return res
        .status(400)
        .json({ message: "Purchase date must be in mm-dd-yyyy format" });
    }

    let linkedReceipt = null;
    if (receiptId) {
      if (!mongoose.isValidObjectId(receiptId)) {
        return res.status(400).json({ message: "Invalid receiptId" });
      }
      linkedReceipt = await Receipt.findById(receiptId);
      if (!linkedReceipt) {
        return res.status(400).json({ message: "Receipt not found" });
      }
      if (linkedReceipt.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to use this receipt" });
      }
    }

    // Create a new review instance
    const review = new Review({
      userId: req.user.id,
      userRole, // Automatically set from the authenticated user
      restaurantId,
      foodItem,
      score,
      ambianceRating: ambianceRating || undefined,
      comment,
      photos,
      tags,
      sizeOptions,
      purchaseDate: moment(purchaseDate, "MM-DD-YYYY").toDate(), // Convert to a Date object
      receiptId: linkedReceipt ? linkedReceipt._id : undefined,
    });

    // Save the review to the database
    const savedReview = await review.save();

    if (linkedReceipt) {
      linkedReceipt.reviewIds = linkedReceipt.reviewIds || [];
      linkedReceipt.reviewIds.push(savedReview._id);
      if (!linkedReceipt.restaurantId) {
        linkedReceipt.restaurantId = restaurantId;
      }
      if (linkedReceipt.status === "pending") {
        linkedReceipt.status = "confirmed";
      }
      await linkedReceipt.save();
    }

    // Update the food item scores based on the review
    await updateScores(foodItem);

    // Update user's points
    let pointsToAdd = 1; // 1 point for creating a review
    if (comment) pointsToAdd += 1; // Additional point for a comment
    if (photos && photos.length > 0) pointsToAdd += 1; // Additional point for adding photos

    const user = await User.findById(req.user.id);
    user.points += pointsToAdd; // Update the user's points

    // Add the review to the user's reviews array
    user.reviews.push(savedReview._id);

    // Save the updated user
    await user.save();

    res.status(201).json(savedReview);
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
