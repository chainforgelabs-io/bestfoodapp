// Serverless entry point for Vercel
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables");
}

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Create Express app for Vercel
const app = express();

// Middleware to handle Vercel path rewriting
app.use((req, res, next) => {
  // If there's a path query parameter, use it to set the correct URL
  if (req.query.path) {
    req.url = "/" + req.query.path;
    delete req.query.path;
  }
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Import routes directly
const authRoutes = require("../backend/routes/auth");
const userRoutes = require("../backend/routes/user");
const restaurantRoutes = require("../backend/routes/restaurant");
const reviewRoutes = require("../backend/routes/review");
const leaderboardRoutes = require("../backend/routes/leaderboard");
const foodItemRoutes = require("../backend/routes/foodItem");
const addressRoutes = require("../backend/routes/address");

// Use routes (MODIFIED - removed /api prefix)
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/reviews", reviewRoutes);
app.use("/leaderboards", leaderboardRoutes);
app.use("/food-items", foodItemRoutes);
app.use("/addresses", addressRoutes);

// Basic route for testing (MODIFIED - now accessible at /api/)
app.get("/", (req, res) => {
  res.json({ message: "Food Ranking API root reached" });
});

// Handle non-API routes
app.use("*", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Export for Vercel serverless
module.exports = app;
module.exports.default = app;
