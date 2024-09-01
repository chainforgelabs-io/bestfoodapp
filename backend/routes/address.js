const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Address = require("../models/Address");
const Restaurant = require("../models/Restaurant");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware");

// Helper function to get restaurants and reviews by location
async function getRestaurantsAndReviewsByLocation(locationType, locationValue) {
  const addresses = await Address.find({ [locationType]: locationValue });

  if (!addresses || addresses.length === 0) {
    return { error: `No addresses found in ${locationValue}` };
  }

  const addressIds = addresses.map((address) => address._id);
  const restaurants = await Restaurant.find({ address: { $in: addressIds } });

  if (!restaurants || restaurants.length === 0) {
    return { error: `No restaurants found in ${locationValue}` };
  }

  const restaurantIds = restaurants.map((restaurant) => restaurant._id);
  const foodItems = await FoodItem.find({
    restaurant: { $in: restaurantIds },
  });

  if (!foodItems || foodItems.length === 0) {
    return { error: `No food items found in ${locationValue}` };
  }

  const foodItemIds = foodItems.map((item) => item._id);
  const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

  if (!reviews || reviews.length === 0) {
    return { error: `No reviews found for food items in ${locationValue}` };
  }

  return { restaurants, reviews };
}

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

// Get all addresses (Public: Anyone can view addresses)
router.get("/", async (req, res) => {
  try {
    const addresses = await Address.find();
    res.status(200).json(addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get the overall score for a city (Public: Anyone can view the overall score for a city)
router.get("/city/:city/score", async (req, res) => {
  try {
    const { city } = req.params;
    const { error, reviews } = await getRestaurantsAndReviewsByLocation(
      "city",
      city
    );

    if (error) {
      return res.status(404).json({ message: error });
    }

    const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
    const averageScore = totalScore / reviews.length;

    res.json({ city, overallScore: averageScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get the overall score for a province (Public: Anyone can view the overall score for a province)
router.get("/province/:province/score", async (req, res) => {
  try {
    const { province } = req.params;
    const { error, reviews } = await getRestaurantsAndReviewsByLocation(
      "province",
      province
    );

    if (error) {
      return res.status(404).json({ message: error });
    }

    const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
    const averageScore = totalScore / reviews.length;

    res.json({ province, overallScore: averageScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get the overall score for a country (Public: Anyone can view the overall score for a country)
router.get("/country/:country/score", async (req, res) => {
  try {
    const { country } = req.params;
    const { error, reviews } = await getRestaurantsAndReviewsByLocation(
      "country",
      country
    );

    if (error) {
      return res.status(404).json({ message: error });
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
    const { city } = req.params;
    const { error, reviews } = await getRestaurantsAndReviewsByLocation(
      "city",
      city
    );

    if (error) {
      return res.status(404).json({ message: error });
    }

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all reviews for a specific country (Public: Anyone can view reviews for a country)
router.get("/country/:country/reviews", async (req, res) => {
  try {
    const { country } = req.params;
    const { error, reviews } = await getRestaurantsAndReviewsByLocation(
      "country",
      country
    );

    if (error) {
      return res.status(404).json({ message: error });
    }

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
