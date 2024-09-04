// routes/admin.js

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/authMiddleware");

// Route to assign admin role (Protected: Only admins can assign admin roles)
router.put("/assign-admin/:id", protect, admin, async (req, res) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" }); // User does not exist
    }

    // Assign the admin role to the user
    user.role = "admin";
    await user.save();

    res.status(200).json({ message: `${user.username} is now an admin` }); // Confirmation message
  } catch (err) {
    res.status(500).json({ message: "Server error" }); // Handle any errors
  }
});

module.exports = router;
