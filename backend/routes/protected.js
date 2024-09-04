const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Define a protected route
router.get("/protected", protect, (req, res) => {
  res
    .status(200)
    .json({ message: "Access granted to protected route", user: req.user });
});

module.exports = router;
