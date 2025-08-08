const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment-specific .env file based on NODE_ENV
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

// Fallback to .env if no specific file is not found
dotenv.config(); // This ensures .env is loaded if NODE_ENV is not set or is invalid

const app = express();

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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization"],
};

app.use(cors(corsOptions));
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Routes
const restaurantRoutes = require("./routes/restaurant");
app.use("/api/restaurants", restaurantRoutes);

const foodItemRoutes = require("./routes/foodItem");
app.use("/api/food-items", foodItemRoutes);

const reviewRoutes = require("./routes/review");
app.use("/api/reviews", reviewRoutes);

const addressRoutes = require("./routes/address");
app.use("/api/addresses", addressRoutes);

const userRoutes = require("./routes/user");
app.use("/api/users", userRoutes);

// Add the authentication routes here
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes); // <-- New line to include auth routes

const protectedRoute = require("./routes/protected");
app.use("/api", protectedRoute);

// Add the admin routes here
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes); // New line to include admin routes

// Add the optimized leaderboard routes here
const leaderboardRoutes = require("./routes/leaderboard");
app.use("/api/leaderboards", leaderboardRoutes); // New optimized leaderboard endpoints

// Uploads (S3 presign)
const uploadsRoutes = require("./routes/uploads");
app.use("/api/uploads", uploadsRoutes);

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Error connecting to MongoDB", err));

// For Vercel deployment: Check if this is being run directly (dev environment)
// or as a module (production/Vercel)
if (require.main === module) {
  // Start server only when running directly (not in Vercel)
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Export the Express app for Vercel serverless functions
module.exports = app;
