const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Address = require("../models/Address");
const Restaurant = require("../models/Restaurant");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware");

// Helper function to categorize prices
function categorizePrices(prices) {
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const lowPrice = sortedPrices[Math.floor(sortedPrices.length * 0.33)];
  const highPrice = sortedPrices[Math.floor(sortedPrices.length * 0.66)];

  return { lowPrice, highPrice };
}

// Create a new food item (Protected: Only authenticated users can create food items)
router.post("/", protect, async (req, res) => {
  try {
    const { name, type, subType, cuisine, price, restaurant } = req.body;

    const foodItem = new FoodItem({
      name,
      type,
      subType,
      cuisine,
      price,
      restaurant,
      createdBy: req.user._id,
    });

    const savedFoodItem = await foodItem.save();

    res.status(201).json(savedFoodItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get all food items (Public: Anyone can view food items)
router.get("/", async (req, res) => {
  try {
    const foodItems = await FoodItem.find().populate("restaurant");
    res.status(200).json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single food item by ID (Public: Anyone can view a food item)
router.get("/:id", async (req, res) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id).populate(
      "restaurant"
    );
    if (!foodItem)
      return res.status(404).json({ message: "Food item not found" });
    res.status(200).json(foodItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all food items from restaurant id (Public: Anyone can view food items by restaurant)
router.get("/restaurant/:restaurantId", async (req, res) => {
  try {
    const foodItems = await FoodItem.find({
      restaurant: req.params.restaurantId,
    });
    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: "No food items found for this restaurant" });
    }
    res.json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get the overall score for a specific food item (Public: Anyone can view the score)
router.get("/:foodItemId/score", async (req, res) => {
  try {
    const { foodItemId } = req.params;

    const reviews = await Review.find({ foodItem: foodItemId });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: "No reviews found for this food item" });
    }

    const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
    const averageScore = totalScore / reviews.length;

    res.status(200).json({ foodItem: foodItemId, averageScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ranked list of food items by category or subcategory (Public: Anyone can view ranked lists)
router.get("/rank/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { subCategory } = req.query;

    const query = subCategory ? { subType: subCategory } : { type: category };
    const foodItems = await FoodItem.find(query);

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found for the provided criteria` });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: `No reviews found for the provided criteria` });
    }

    const scores = foodItems.map((item) => {
      const itemReviews = reviews.filter(
        (review) => review.foodItem.toString() === item._id.toString()
      );
      const totalScore = itemReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );
      const averageScore = itemReviews.length
        ? totalScore / itemReviews.length
        : 0;
      return {
        foodItem: item,
        averageScore,
      };
    });

    const rankedList = scores.sort((a, b) => b.averageScore - a.averageScore);

    res.status(200).json(rankedList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ranked list of food items by category or subcategory and city
router.get("/rank/category/:category/city/:city", async (req, res) => {
  try {
    const { category, city } = req.params;
    const { subCategory } = req.query;

    const addresses = await Address.find({ city: city });
    const addressIds = addresses.map((address) => address._id);

    const restaurants = await Restaurant.find({ address: { $in: addressIds } });
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    const query = subCategory
      ? { subType: subCategory, restaurant: { $in: restaurantIds } }
      : { type: category, restaurant: { $in: restaurantIds } };

    const foodItems = await FoodItem.find(query);

    if (!foodItems || foodItems.length === 0) {
      return res.status(404).json({
        message: `No food items found for the provided criteria in city: ${city}`,
      });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({
        message: `No reviews found for the provided criteria in city: ${city}`,
      });
    }

    const scores = foodItems.map((item) => {
      const itemReviews = reviews.filter(
        (review) => review.foodItem.toString() === item._id.toString()
      );
      const totalScore = itemReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );
      const averageScore = itemReviews.length
        ? totalScore / itemReviews.length
        : 0;
      return {
        foodItem: item,
        averageScore,
      };
    });

    const rankedList = scores.sort((a, b) => b.averageScore - a.averageScore);

    res.status(200).json(rankedList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ranked list of food items by category or subcategory and province
router.get("/rank/category/:category/province/:province", async (req, res) => {
  try {
    const { category, province } = req.params;
    const { subCategory } = req.query;

    const addresses = await Address.find({ province: province });
    const addressIds = addresses.map((address) => address._id);

    const restaurants = await Restaurant.find({ address: { $in: addressIds } });
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    const query = subCategory
      ? { subType: subCategory, restaurant: { $in: restaurantIds } }
      : { type: category, restaurant: { $in: restaurantIds } };

    const foodItems = await FoodItem.find(query);

    if (!foodItems || foodItems.length === 0) {
      return res.status(404).json({
        message: `No food items found for the provided criteria in province: ${province}`,
      });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({
        message: `No reviews found for the provided criteria in province: ${province}`,
      });
    }

    const scores = foodItems.map((item) => {
      const itemReviews = reviews.filter(
        (review) => review.foodItem.toString() === item._id.toString()
      );
      const totalScore = itemReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );
      const averageScore = itemReviews.length
        ? totalScore / itemReviews.length
        : 0;
      return {
        foodItem: item,
        averageScore,
      };
    });

    const rankedList = scores.sort((a, b) => b.averageScore - a.averageScore);

    res.status(200).json(rankedList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ranked list of food items by category or subcategory and country
router.get("/rank/category/:category/country/:country", async (req, res) => {
  try {
    const { category, country } = req.params;
    const { subCategory } = req.query;

    const addresses = await Address.find({ country: country });
    const addressIds = addresses.map((address) => address._id);

    const restaurants = await Restaurant.find({ address: { $in: addressIds } });
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    const query = subCategory
      ? { subType: subCategory, restaurant: { $in: restaurantIds } }
      : { type: category, restaurant: { $in: restaurantIds } };

    const foodItems = await FoodItem.find(query);

    if (!foodItems || foodItems.length === 0) {
      return res.status(404).json({
        message: `No food items found for the provided criteria in country: ${country}`,
      });
    }

    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({
        message: `No reviews found for the provided criteria in country: ${country}`,
      });
    }

    const scores = foodItems.map((item) => {
      const itemReviews = reviews.filter(
        (review) => review.foodItem.toString() === item._id.toString()
      );
      const totalScore = itemReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );
      const averageScore = itemReviews.length
        ? totalScore / itemReviews.length
        : 0;
      return {
        foodItem: item,
        averageScore,
      };
    });

    const rankedList = scores.sort((a, b) => b.averageScore - a.averageScore);

    res.status(200).json(rankedList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ranked lists of food items by price range
router.get("/rank/category/:foodCategory/price-range", async (req, res) => {
  try {
    const { foodCategory } = req.params;
    const { range } = req.query;

    const foodItems = await FoodItem.find({ type: foodCategory });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found for ${foodCategory}` });
    }

    const prices = foodItems.map((item) => item.price);
    const { lowPrice, highPrice } = categorizePrices(prices);

    let filteredItems;
    if (range === "budget") {
      filteredItems = foodItems.filter((item) => item.price <= lowPrice);
    } else if (range === "mid-range") {
      filteredItems = foodItems.filter(
        (item) => item.price > lowPrice && item.price <= highPrice
      );
    } else if (range === "high-end") {
      filteredItems = foodItems.filter((item) => item.price > highPrice);
    } else if (!range) {
      const budgetItems = foodItems.filter((item) => item.price <= lowPrice);
      const midRangeItems = foodItems.filter(
        (item) => item.price > lowPrice && item.price <= highPrice
      );
      const highEndItems = foodItems.filter((item) => item.price > highPrice);

      const rankByScore = async (items) => {
        const scores = await Promise.all(
          items.map(async (item) => {
            const reviews = await Review.find({ foodItem: item._id });
            const avgScore =
              reviews.reduce((sum, review) => sum + review.score, 0) /
                reviews.length || 0;
            return { item, avgScore };
          })
        );
        return scores
          .sort((a, b) => b.avgScore - a.avgScore)
          .map((score) => score.item);
      };

      const rankedBudget = await rankByScore(budgetItems);
      const rankedMidRange = await rankByScore(midRangeItems);
      const rankedHighEnd = await rankByScore(highEndItems);

      return res.json({
        budget: rankedBudget,
        midRange: rankedMidRange,
        highEnd: rankedHighEnd,
      });
    } else {
      return res.status(400).json({ message: "Invalid price range specified" });
    }

    const rankByScore = async (items) => {
      const scores = await Promise.all(
        items.map(async (item) => {
          const reviews = await Review.find({ foodItem: item._id });
          const avgScore =
            reviews.reduce((sum, review) => sum + review.score, 0) /
              reviews.length || 0;
          return { item, avgScore };
        })
      );
      return scores
        .sort((a, b) => b.avgScore - a.avgScore)
        .map((score) => score.item);
    };

    const rankedItems = await rankByScore(filteredItems);

    res.json({ range, rankedItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a food item by ID (Protected: Only authenticated users can update a food item)
router.put("/:id", protect, async (req, res) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem)
      return res.status(404).json({ message: "Food item not found" });

    if (foodItem.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Unauthorized action" });
    }

    const updatedFoodItem = await FoodItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedFoodItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a food item by ID (Protected: Only authenticated users can delete a food item)
router.delete("/:id", protect, async (req, res) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem)
      return res.status(404).json({ message: "Food item not found" });

    if (foodItem.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Unauthorized action" });
    }

    await foodItem.deleteOne();
    res.status(200).json({ message: "Food item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
