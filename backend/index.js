const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
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

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Error connecting to MongoDB", err));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
