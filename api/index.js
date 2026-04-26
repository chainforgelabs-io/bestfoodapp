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

// Enhanced CORS configuration for better authentication support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // In production, allow specific domains
    const allowedOrigins = [
      "https://bestfoodapp.com",
      "https://www.bestfoodapp.com",
      "https://bestfoodapp.vercel.app",
      // Add any preview URLs or additional domains as needed
    ];

    // Allow Vercel preview URLs
    if (origin.includes(".vercel.app")) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // Important for authentication
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Import routes directly
const authRoutes = require("../backend/routes/auth");
const userRoutes = require("../backend/routes/user");
const restaurantRoutes = require("../backend/routes/restaurant");
const reviewRoutes = require("../backend/routes/review");
const leaderboardRoutes = require("../backend/routes/leaderboard");
const foodItemRoutes = require("../backend/routes/foodItem");
const addressRoutes = require("../backend/routes/address");
const uploadsRoutes = require("../backend/routes/uploads");
const receiptRoutes = require("../backend/routes/receipts");

// Use routes (MODIFIED - removed /api prefix; Vercel rewrites /api/* to ?path=*)
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/reviews", reviewRoutes);
app.use("/leaderboards", leaderboardRoutes);
app.use("/food-items", foodItemRoutes);
app.use("/addresses", addressRoutes);
app.use("/uploads", uploadsRoutes);
app.use("/receipts", receiptRoutes);

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
