const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Create a new user
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

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
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

router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/follow", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.body.userId); // Assuming you pass the current user's ID in the body

    if (!user.followers.includes(req.body.userId)) {
      await user.updateOne({ $push: { followers: req.body.userId } });
      await currentUser.updateOne({ $push: { following: req.params.id } });
      res.status(200).json("User has been followed");
    } else {
      res.status(403).json("You already follow this user");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/:id/unfollow", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.body.userId); // Assuming you pass the current user's ID in the body

    if (user.followers.includes(req.body.userId)) {
      await user.updateOne({ $pull: { followers: req.body.userId } });
      await currentUser.updateOne({ $pull: { following: req.params.id } });
      res.status(200).json("User has been unfollowed");
    } else {
      res.status(403).json("You don't follow this user");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
