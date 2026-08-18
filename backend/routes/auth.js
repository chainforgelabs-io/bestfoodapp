const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const secret = process.env.JWT_SECRET;
const User = require("../models/User"); // Import the User model
const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;
  try {
    // Check if the user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create a new user
    const user = new User({ email, password, username });
    await user.save();

    const expirationTime = "30d";
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: expirationTime,
    });

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, username: user.username },
      expiresIn: expirationTime,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login a user and return a token
router.post("/login", async (req, res) => {
  const { email, password, keepLoggedIn } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Stay logged in by default. Only issue a 1-hour token when the client
    // explicitly sends keepLoggedIn: false.
    const expirationTime = keepLoggedIn === false ? "1h" : "30d";
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: expirationTime,
    });

    console.log(`Token generated with expiration: ${expirationTime}`);

    // Respond with token and user info
    res.json({
      token,
      user: { id: user._id, email: user.email, username: user.username },
      expiresIn: expirationTime,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
