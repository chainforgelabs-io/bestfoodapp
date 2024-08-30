const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Address = require("../models/Address");
const Restaurant = require("../models/Restaurant");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware"); // Import the protect middleware

// POST route to create a new address (Protected: Only authenticated users can create addresses)
router.post("/", protect, async (req, res) => {
  try {
    const address = new Address(req.body);
    const savedAddress = await address.save();
    res.status(201).json(savedAddress);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get the overall score for a city (Public: Anyone can view the overall score for a city)
router.get("/city/:city/score", async (req, res) => {
  try {
    const city = req.params.city;

    const addresses = await Address.find({ city: city });

    if (!addresses || addresses.length === 0) {
      return res.status(404).json({ message: `No addresses found in ${city}` });
    }

    const addressIds = addresses.map((address) => address._id);
    const restaurants = await Restaurant.find({ address: { $in: addressIds } });

    if (!restaurants || restaurants.length === 0) {
      return res
        .status(404)
        .json({ message: `No restaurants found in ${city}` });
    }

    const restaurantIds = restaurants.map((restaurant) => restaurant._id);
    const foodItems = await FoodItem.find({
      restaurant: { $in: restaurantIds },
    });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found in ${city}` });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: `No reviews found for food items in ${city}` });
    }

    const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
    const averageScore = totalScore / reviews.length;

    res.json({ city, overallScore: averageScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get the overall score for a country (Public: Anyone can view the overall score for a country)
router.get("/country/:country/score", async (req, res) => {
  try {
    const country = req.params.country;

    const addresses = await Address.find({ country: country });

    if (!addresses || addresses.length === 0) {
      return res
        .status(404)
        .json({ message: `No addresses found in ${country}` });
    }

    const addressIds = addresses.map((address) => address._id);
    const restaurants = await Restaurant.find({ address: { $in: addressIds } });

    if (!restaurants || restaurants.length === 0) {
      return res
        .status(404)
        .json({ message: `No restaurants found in ${country}` });
    }

    const restaurantIds = restaurants.map((restaurant) => restaurant._id);
    const foodItems = await FoodItem.find({
      restaurant: { $in: restaurantIds },
    });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found in ${country}` });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: `No reviews found for food items in ${country}` });
    }

    const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
    const averageScore = totalScore / reviews.length;

    res.json({ country, overallScore: averageScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all reviews for a specific city (Public: Anyone can view reviews for a city)
router.get("/city/:city/reviews", async (req, res) => {
  try {
    const city = req.params.city;

    const addresses = await Address.find({ city: city });

    if (!addresses || addresses.length === 0) {
      return res.status(404).json({ message: `No addresses found in ${city}` });
    }

    const addressIds = addresses.map((address) => address._id);
    const restaurants = await Restaurant.find({ address: { $in: addressIds } });

    if (!restaurants || restaurants.length === 0) {
      return res
        .status(404)
        .json({ message: `No restaurants found in ${city}` });
    }

    const restaurantIds = restaurants.map((restaurant) => restaurant._id);
    const foodItems = await FoodItem.find({
      restaurant: { $in: restaurantIds },
    });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found in ${city}` });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: `No reviews found for food items in ${city}` });
    }

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all reviews for a specific country (Public: Anyone can view reviews for a country)
router.get("/country/:country/reviews", async (req, res) => {
  try {
    const country = req.params.country;

    const addresses = await Address.find({ country: country });

    if (!addresses || addresses.length === 0) {
      return res
        .status(404)
        .json({ message: `No addresses found in ${country}` });
    }

    const addressIds = addresses.map((address) => address._id);
    const restaurants = await Restaurant.find({ address: { $in: addressIds } });

    if (!restaurants || restaurants.length === 0) {
      return res
        .status(404)
        .json({ message: `No restaurants found in ${country}` });
    }

    const restaurantIds = restaurants.map((restaurant) => restaurant._id);
    const foodItems = await FoodItem.find({
      restaurant: { $in: restaurantIds },
    });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found in ${country}` });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: `No reviews found for food items in ${country}` });
    }

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
