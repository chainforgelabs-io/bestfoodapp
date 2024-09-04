const express = require("express");
const router = express.Router();
const User = require("../models/User");
const FoodItem = require("../models/FoodItem");
const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const { protect } = require("../middleware/authMiddleware"); // Import the protect middleware

// Get the current user's points (Protected: Only authenticated users can view their points)
router.get("/points", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("points");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ points: user.points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new user (Registration - no protection needed here)
router.post("/", async (req, res) => {
  try {
    const { username, email, password, profilePicture, bio } = req.body;
    const user = new User({
      username,
      email,
      password, // In a real-world application, make sure to hash the password before saving
      profilePicture,
      bio,
    });
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// View User Profile (Protected: Only the authenticated user can view their own profile)
router.get("/profile", protect, (req, res) => {
  res.status(200).json(req.user);
});

// Update User Profile (Protected: Only the authenticated user can update their own profile)
router.put("/profile", protect, async (req, res) => {
  try {
    const updatedData = req.body;

    // Find the user by ID and update their profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password"); // Don't return the password

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
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

// Get a user's profile by ID (Protected: Only authenticated users should view user profiles)
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
