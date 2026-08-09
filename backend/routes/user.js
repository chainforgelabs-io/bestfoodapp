const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const FoodItem = require("../models/FoodItem");
const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const Address = require("../models/Address");
const {
  protect,
  optionalAuth,
} = require("../middleware/authMiddleware"); // Import auth middleware
const { sendPasswordResetEmail } = require("../utils/emailService");
const crypto = require("crypto");

const bcrypt = require("bcryptjs");

// Get all users (for debugging - remove in production)
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get the current user's points (Protected: Only authenticated users can view their points)
// Create a new user (Registration - no protection needed here)
router.post("/", async (req, res) => {
  console.log("Received request body:", req.body);
  try {
    const {
      username,
      email,
      password,
      firstName, // Added field
      lastName, // Added field
      profilePicture,
      bio,
      dateOfBirth,
      sex,
      location: { city, province, country },
      incomeRange,
      maritalStatus,
      occupation,
    } = req.body;

    // Check if the username or email is already taken
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username or email is already taken.",
      });
    }

    // Create a new user object, without hashing the password here
    const user = new User({
      username,
      email,
      password,
      firstName, // Optional field
      lastName, // Optional field
      profilePicture,
      bio,
      dateOfBirth,
      sex,
      location: {
        city,
        province,
        country,
      },
      incomeRange,
      maritalStatus,
      occupation,
    });

    // Save the new user to the database
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ message: err.message });
  }
});

// POST route to request password reset
router.post("/forgot-password", async (req, res) => {
  console.log("=== FORGOT PASSWORD ROUTE HIT ===");
  console.log("Request body:", req.body);

  const { email } = req.body;
  console.log("Email from request:", email);
  console.log("Email length:", email.length);
  console.log("Email trimmed:", email.trim());

  try {
    console.log("Searching for user with email:", email);

    // Let's also try to find all users to see what emails exist
    const allUsers = await User.find({}).select("email username");
    console.log(
      "All users in database:",
      allUsers.map((u) => ({ email: u.email, username: u.username }))
    );

    // Try case-insensitive search
    const userCaseInsensitive = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, "i") },
    });
    console.log(
      "Case-insensitive search result:",
      userCaseInsensitive ? "FOUND" : "NOT FOUND"
    );

    const user = await User.findOne({ email });
    console.log("User found:", user ? "YES" : "NO");

    if (!user) {
      console.log("User not found, returning 404");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found, generating reset token...");
    // Generate a token for the reset link (valid for a limited time)
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour

    // Log the generated token and its expiration
    console.log(`Generated token: ${resetToken}`);
    console.log(`Current time: ${new Date()}`);
    console.log(`Token expires at: ${new Date(user.resetPasswordExpire)}`);

    console.log("Saving user with reset token...");
    await user.save();

    // Confirm that the user has been updated properly
    const updatedUser = await User.findOne({ email });
    console.log(
      `User after token generation: ${updatedUser ? "SAVED" : "NOT SAVED"}`
    );

    console.log("Attempting to send password reset email...");
    // Send the email with the reset token
    await sendPasswordResetEmail(email, resetToken);
    console.log("Email sent successfully");
    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("ERROR in forgot-password route:", err);
    res.status(500).json({ message: "Error sending email" });
  }
});

// Serve the reset password page, or redirect to a frontend URL to handle it
// user.js - Reset password route
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  console.log("Received reset token:", token); // Log the token received in the request
  console.log("New password from request:", password); // Log the password from the request body

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }, // Ensure token is not expired
    });

    console.log(`User found: ${user}`);

    if (!user) {
      console.log("User not found or token expired"); // Log when the token is invalid or expired
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Log token expiration and current time to check why it's expired
    console.log(`Token expires at: ${new Date(user.resetPasswordExpire)}`);
    console.log(`Current time: ${new Date(Date.now())}`);

    user.password = password; // Assign new password
    user.resetPasswordToken = undefined; // Clear reset token
    user.resetPasswordExpire = undefined; // Clear token expiration
    await user.save();

    console.log("Password reset successful for user:", user.email); // Log success message
    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Error during password reset:", err); // Log any error that happens
    res.status(400).json({ message: "Error resetting password." });
  }
});

// Check if username or email is already taken
router.post("/checkAvailability", async (req, res) => {
  try {
    const { username, email } = req.body;
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username or email is already taken.",
      });
    }
    res.status(200).json({ message: "Username and email are available." });
  } catch (error) {
    res.status(500).json({ message: "Error checking availability." });
  }
});

// View User Profile (Protected: Only the authenticated user can view their own profile)
router.get("/profile", protect, (req, res) => {
  res.status(200).json(req.user);
});

// Update User Profile (Protected: Only the authenticated user can update their own profile)
router.put("/profile", protect, async (req, res) => {
  try {
    const allowed = [
      "bio",
      "firstName",
      "lastName",
      "profilePicture",
      "location",
      "showAdminTools",
      "sex",
      "incomeRange",
      "maritalStatus",
      "occupation",
    ];
    const updatedData = { updatedAt: Date.now() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updatedData[key] = req.body[key];
    }
    // Only admins may toggle showAdminTools
    if (
      updatedData.showAdminTools !== undefined &&
      req.user.role !== "admin"
    ) {
      delete updatedData.showAdminTools;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password"); // Exclude the password field from the response

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /users/search?q= — public username / name search (before /:id)
router.get("/search", optionalAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 1) {
      return res.json({ users: [] });
    }
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const users = await User.find({
      $or: [
        { username: regex },
        { firstName: regex },
        { lastName: regex },
      ],
    })
      .select("_id username profilePicture firstName lastName")
      .limit(20)
      .lean();
    res.json({ users });
  } catch (err) {
    console.error("users search", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete User Account
router.delete("/profile", protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.status(200).json({ msg: "User account deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user details, reviews, followers, and following (public read)
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    // Find user by ID and populate followers and following before executing the query
    const user = await User.findById(req.params.id)
      .populate("followers", "username") // Get usernames of followers
      .populate("following", "username") // Get usernames of people the user is following
      .select("-password"); // Exclude password field

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find all reviews by the user - fix field name from 'user' to 'userId'
    const reviews = await Review.find({ userId: req.params.id })
      .populate("foodItem", "name category type price")
      .populate("restaurantId", "name type cuisine")
      .sort({ reviewDate: -1 });

    res.status(200).json({
      user, // Populated user with followers and following
      reviews, // User's reviews with populated data
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all reviews by a specific user (public read)
router.get("/:id/reviews", optionalAuth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.id });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: "No reviews found for this user" });
    }

    res.status(200).json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /users/:id/stats — review aggregates for profile header (public read)
router.get("/:id/stats", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(id);

    const [agg] = await Review.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurantId",
          foreignField: "_id",
          as: "restaurantDoc",
        },
      },
      { $unwind: { path: "$restaurantDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "addresses",
          localField: "restaurantDoc.address",
          foreignField: "_id",
          as: "addressDoc",
        },
      },
      { $unwind: { path: "$addressDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          reviewCount: { $sum: 1 },
          avgScore: { $avg: "$score" },
          restaurantIds: { $addToSet: "$restaurantId" },
          cities: { $addToSet: "$addressDoc.city" },
        },
      },
    ]);

    const reviewCount = agg?.reviewCount || 0;
    const restaurantCount = agg?.restaurantIds?.length || 0;
    const cities = (agg?.cities || []).filter(Boolean);
    const cityCount = cities.length;
    const avgScore =
      reviewCount > 0 ? Math.round(agg.avgScore) : 0;

    res.json({
      reviewCount,
      restaurantCount,
      cityCount,
      avgScore,
    });
  } catch (err) {
    console.error("user stats", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Paginated & sortable user reviews
// GET /users/:id/reviews-paginated?page=1&limit=12&sort=date|score|photos&order=desc|asc
router.get("/:id/reviews-paginated", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "12", 10), 1),
      50
    );
    const sortKey = (req.query.sort || "date").toLowerCase();
    const order = (req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;

    const sort =
      sortKey === "score"
        ? { score: order }
        : sortKey === "photos"
        ? { photosCount: order, reviewDate: -1 }
        : { reviewDate: order };

    // Build query
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const baseMatch = { userId: new mongoose.Types.ObjectId(id) };

    // Aggregate to include photos count for sorting
    const pipeline = [
      { $match: baseMatch },
      {
        $addFields: {
          photosCount: { $size: { $ifNull: ["$photos", []] } },
        },
      },
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "fooditems",
          localField: "foodItem",
          foreignField: "_id",
          as: "foodItem",
        },
      },
      { $unwind: { path: "$foodItem", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurantId",
          foreignField: "_id",
          as: "restaurant",
        },
      },
      { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
    ];

    const [items, total] = await Promise.all([
      Review.aggregate(pipeline),
      Review.countDocuments(baseMatch),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all followers of a specific user (public read)
router.get("/:id/followers", optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "followers",
      "username"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.followers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users that a specific user is following (public read)
router.get("/:id/following", optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "following",
      "username"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.following);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a user's profile by ID (Protected: Only the authenticated user should update their own profile)
router.put("/:id", protect, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).select("-password");
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a user (Protected: Only the authenticated user should delete their own account)
router.delete("/:id", protect, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Follow a user (Protected: Only authenticated users should be able to follow others)
router.post("/:id/follow", protect, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!currentUser.following.includes(req.params.id)) {
      await currentUser.updateOne({ $push: { following: req.params.id } });
      await userToFollow.updateOne({ $push: { followers: req.user.id } });
      res.status(200).json("User has been followed");
    } else {
      res.status(403).json("You already follow this user");
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Unfollow a user (Protected: Only authenticated users should be able to unfollow others)
router.post("/:id/unfollow", protect, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToUnfollow) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.following.includes(req.params.id)) {
      await currentUser.updateOne({ $pull: { following: req.params.id } });
      await userToUnfollow.updateOne({ $pull: { followers: req.user.id } });
      res.status(200).json("User has been unfollowed");
    } else {
      res.status(403).json("You don't follow this user");
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a user's followers and following count (Protected: Only authenticated users should view user profiles)
router.get("/:id/followers-following", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("followers", "username")
      .populate("following", "username");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      followers: user.followers.length,
      following: user.following.length,
      followerUsernames: user.followers.map((follower) => follower.username),
      followingUsernames: user.following.map(
        (followedUser) => followedUser.username
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit a meal review (Protected: Only authenticated users can submit a meal)
router.post("/meal", protect, async (req, res) => {
  try {
    const { restaurantId, foodItems } = req.body;

    // Validate that the restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    let weightedSum = 0;
    let totalWeight = 0;
    const individualScores = [];

    // Category weights
    const categoryWeights = {
      Mains: 0.35,
      Burgers: 0.2,
      "Sandwiches/Handhelds": 0.15,
      "Deep-Fried": 0.1,
      Appetizers: 0.075,
      Sides: 0.05,
      Desserts: 0.05,
      Drinks: 0.025,
    };

    // Loop through each food item in the meal and calculate the weighted sum
    for (let foodItem of foodItems) {
      const { foodItemId, score } = foodItem;

      // Validate that the food item exists
      const item = await FoodItem.findById(foodItemId);
      if (!item) {
        return res
          .status(404)
          .json({ message: `Food item not found: ${foodItemId}` });
      }

      // Use category weight for this food item
      const categoryWeight = categoryWeights[item.category] || 0;
      weightedSum += score * categoryWeight;
      totalWeight += categoryWeight;

      // Submit individual reviews for food items (which will affect the restaurant score)
      const review = new Review({
        userId: req.user._id,
        restaurantId: restaurantId,
        foodItemId: foodItemId,
        score: score,
      });
      await review.save();

      // Collect the individual food item scores
      individualScores.push({
        foodItemId: item._id,
        name: item.name,
        category: item.category,
        score: score,
        categoryWeight: categoryWeight,
      });
    }

    // Calculate the overall meal score (but do not save it)
    const mealScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Return the individual scores and calculated meal score to the frontend
    res.status(201).json({
      individualScores,
      calculatedMealScore: mealScore,
      message: "Meal review submitted successfully!",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Route to fetch user's submitted meals and display meal scores (Protected: Only authenticated users can view their meals)
router.get("/meals", protect, async (req, res) => {
  try {
    // Find all meals submitted by the authenticated user
    const meals = await Meal.find({ userId: req.user._id }).populate(
      "restaurantId foodItems.foodItemId"
    );
    res.status(200).json(meals);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
