// Serverless entry point for Vercel
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Create Express app for Vercel
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes directly
const authRoutes = require('../backend/routes/auth');
const userRoutes = require('../backend/routes/users');
const restaurantRoutes = require('../backend/routes/restaurants');
const reviewRoutes = require('../backend/routes/reviews');
const leaderboardRoutes = require('../backend/routes/leaderboards');
const foodItemRoutes = require('../backend/routes/foodItems');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/food-items', foodItemRoutes);

// Basic route for testing
app.get('/api', (req, res) => {
  res.json({ message: 'Food Ranking API is running' });
});

// Handle non-API routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Export for Vercel serverless
module.exports = app;
