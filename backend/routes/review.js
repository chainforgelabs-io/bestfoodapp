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

  if (reviews.length === 0) {
    await FoodItem.findByIdAndUpdate(foodItemId, {
      adminScore: 0,
      communityScore: 0,
    });
    return;
  }

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

    // Mark published + fire SEO automation (never blocks the response on failure)
    try {
      savedReview.publishedAt = savedReview.publishedAt || new Date();
      await savedReview.save();
      const { onReviewPublished } = require("../lib/seo");
      setImmediate(() => {
        onReviewPublished(savedReview._id).catch((seoErr) =>
          console.error("onReviewPublished failed", seoErr)
        );
      });
    } catch (seoErr) {
      console.error("seo publish hook setup failed", seoErr);
    }

    res.status(201).json(savedReview);
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

const canModifyReview = (review, user) => {
  if (!review || !user) return false;
  if (review.userId.toString() === user._id.toString()) return true;
  if (user.role === "admin") return true;
  return false;
};

// GET /api/reviews/feed — paginated platform-wide feed (most recent first)
router.get("/feed", protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    // Optional filter: "photos" restricts the feed to reviews that have at
    // least one photo. Anything else (default) returns all reviews.
    const filterQuery =
      req.query.filter === "photos"
        ? { "photos.0": { $exists: true } }
        : {};

    const currentUser = await User.findById(req.user._id)
      .select("following")
      .lean();
    const followingIds = (currentUser?.following || []).map((id) =>
      id.toString()
    );

    const [items, total] = await Promise.all([
      Review.find(filterQuery)
        .sort({ reviewDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username profilePicture")
        .populate("foodItem", "name category type")
        .populate("restaurantId", "name slug")
        .lean(),
      Review.countDocuments(filterQuery),
    ]);

    const enriched = items.map((review) => {
      const authorId = review.userId?._id?.toString() || review.userId?.toString();
      const likedByMe = (review.likes || []).some(
        (uid) => uid.toString() === req.user._id.toString()
      );
      const isOwnPost = authorId === req.user._id.toString();
      return {
        ...review,
        author: review.userId,
        likeCount: (review.likes || []).length,
        likedByMe,
        isOwnPost,
        authorFollowedByMe: authorId
          ? followingIds.includes(authorId)
          : false,
      };
    });

    res.json({
      items: enriched,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    console.error("reviews feed", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/reviews/:id/like
// Public single review (for related-reviews modules / SEO)
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }
    const review = await Review.findById(req.params.id)
      .populate("foodItem", "name category type")
      .populate("restaurantId", "name slug")
      .populate("userId", "username")
      .lean();
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (err) {
    console.error("get review", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/like", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review.userId.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: "You can't like your own post" });
    }
    const userId = req.user._id;
    const alreadyLiked = (review.likes || []).some(
      (uid) => uid.toString() === userId.toString()
    );
    if (!alreadyLiked) {
      review.likes = review.likes || [];
      review.likes.push(userId);
      await review.save();
    }
    res.json({
      likeCount: review.likes.length,
      liked: true,
    });
  } catch (err) {
    console.error("review like", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/reviews/:id/unlike
router.post("/:id/unlike", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    review.likes = (review.likes || []).filter(
      (uid) => uid.toString() !== req.user._id.toString()
    );
    await review.save();
    res.json({
      likeCount: review.likes.length,
      liked: false,
    });
  } catch (err) {
    console.error("review unlike", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/reviews/:id — owner or admin
router.patch("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (!canModifyReview(review, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { score, comment, tags, photos, sizeOptions } = req.body;

    if (score !== undefined) {
      const num = Number(score);
      if (num < 0 || num > 100) {
        return res
          .status(400)
          .json({ message: "Score must be between 0 and 100" });
      }
      review.score = num;
    }
    if (comment !== undefined) review.comment = comment;
    if (tags !== undefined) review.tags = tags;
    if (photos !== undefined) {
      if (!Array.isArray(photos)) {
        return res.status(400).json({ message: "photos must be an array" });
      }
      review.photos = photos;
    }
    if (sizeOptions !== undefined) {
      if (
        sizeOptions &&
        !["small", "medium", "large", "extra large"].includes(sizeOptions)
      ) {
        return res.status(400).json({ message: "Invalid sizeOptions" });
      }
      review.sizeOptions = sizeOptions || undefined;
    }

    await review.save();
    await updateScores(review.foodItem);

    res.json(review);
  } catch (err) {
    console.error("review patch", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/reviews/:id — owner or admin
router.delete("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (!canModifyReview(review, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const foodItemId = review.foodItem;
    const reviewId = review._id;

    await User.updateMany(
      { reviews: reviewId },
      { $pull: { reviews: reviewId } }
    );

    await Receipt.updateMany(
      { reviewIds: reviewId },
      { $pull: { reviewIds: reviewId } }
    );

    await review.deleteOne();
    await updateScores(foodItemId);

    res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("review delete", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
