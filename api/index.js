// Serverless entry point for Vercel
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables");
}

// Cache the connection across serverless invocations. Vercel freezes/thaws and
// reuses containers, so without this each request can run a query before a live
// connection exists, causing Mongoose to buffer and time out after 10s.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // readyState 1 === connected
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // A previous promise may have settled against a now-dead connection; reset it
  // if we are no longer connected so we can establish a fresh connection.
  if (cached.promise && mongoose.connection.readyState === 0) {
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        // Fail fast instead of buffering a query for 10s when disconnected.
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log("MongoDB connected successfully");
        return m;
      })
      .catch((err) => {
        // Clear the cached promise so the next invocation can retry.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

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

// Ensure a live MongoDB connection before any route touches the database.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

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
const adminRoutes = require("../backend/routes/admin");
const socialRoutes = require("../backend/routes/social");
const placesRoutes = require("../backend/routes/places");
const seoAdminRoutes = require("../backend/routes/seoAdmin");
const menuImportRoutes = require("../backend/routes/menuImport");
const foodTaxonomyRoutes = require("../backend/routes/foodTaxonomy");

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
app.use("/admin", adminRoutes);
app.use("/social", socialRoutes);
app.use("/places", placesRoutes);
app.use("/seo", seoAdminRoutes);
app.use("/menu-imports", menuImportRoutes);
app.use("/food-taxonomy", foodTaxonomyRoutes);

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
