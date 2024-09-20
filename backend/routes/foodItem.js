const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Address = require("../models/Address");
const Restaurant = require("../models/Restaurant");
const FoodItem = require("../models/FoodItem");
const Review = require("../models/Review");
const { protect } = require("../middleware/authMiddleware");

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
    const { name, category, type, subType, price, restaurant } = req.body;

    const foodItem = new FoodItem({
      name,
      category,
      type,
      subType,
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

// Route: Search food items by city
router.get("/search", async (req, res) => {
  const { city } = req.query;

  try {
    // Find all addresses in the specified city
    const addresses = await Address.find({ city: city });

    if (!addresses || addresses.length === 0) {
      return res
        .status(404)
        .json({ message: `No addresses found in city: ${city}` });
    }

    // Get the list of address IDs
    const addressIds = addresses.map((address) => address._id);

    // Find all restaurants in those addresses
    const restaurants = await Restaurant.find({
      address: { $in: addressIds },
    }).populate("address");

    if (!restaurants || restaurants.length === 0) {
      return res
        .status(404)
        .json({ message: `No restaurants found in city: ${city}` });
    }

    // Get restaurant IDs from the city
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    // Find all food items for the restaurants in the city
    const foodItems = await FoodItem.find({
      restaurant: { $in: restaurantIds },
    }).populate("restaurant");

    if (!foodItems || foodItems.length === 0) {
      return res.status(404).json({ message: "No food items found" });
    }

    // Respond with the found food items
    res.json(foodItems);
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

// Get the overall admin and community scores for a specific food item
router.get("/:foodItemId/score", async (req, res) => {
  try {
    const { foodItemId } = req.params;

    const reviews = await Review.find({ foodItem: foodItemId });

    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: "No reviews found for this food item" });
    }

    // Separate reviews into admin and community
    const adminReviews = reviews.filter(
      (review) => review.userRole === "admin"
    );
    const communityReviews = reviews.filter(
      (review) => review.userRole !== "admin"
    );

    const adminTotalScore = adminReviews.reduce(
      (sum, review) => sum + review.score,
      0
    );
    const communityTotalScore = communityReviews.reduce(
      (sum, review) => sum + review.score,
      0
    );

    const adminAverageScore = adminReviews.length
      ? adminTotalScore / adminReviews.length
      : 0;
    const communityAverageScore = communityReviews.length
      ? communityTotalScore / communityReviews.length
      : 0;

    res.status(200).json({
      foodItem: foodItemId,
      adminScore: adminAverageScore,
      communityScore: communityAverageScore,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get ranked list of all food items in a city
router.get("/rank/city/:city", async (req, res) => {
  try {
    const { city } = req.params;

    // Find all addresses in the specified city
    const addresses = await Address.find({ city: city });
    const addressIds = addresses.map((address) => address._id);

    // Find all restaurants in those addresses
    const restaurants = await Restaurant.find({
      address: { $in: addressIds },
    }).populate("address");
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    // Find all food items for the restaurants in the city
    const foodItems = await FoodItem.find({
      restaurant: { $in: restaurantIds },
    }).populate("restaurant");

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: "No food items found in this city" });
    }

    // Rank the food items by their admin and community scores
    const rankByScore = async (items) => {
      const scores = await Promise.all(
        items.map(async (item) => {
          const reviews = await Review.find({ foodItem: item._id });

          const adminReviews = reviews.filter(
            (review) => review.userRole === "admin"
          );
          const communityReviews = reviews.filter(
            (review) => review.userRole !== "admin"
          );

          const adminAverageScore = adminReviews.length
            ? adminReviews.reduce((sum, review) => sum + review.score, 0) /
              adminReviews.length
            : 0;

          const communityAverageScore = communityReviews.length
            ? communityReviews.reduce((sum, review) => sum + review.score, 0) /
              communityReviews.length
            : 0;

          const overallAverageScore =
            adminAverageScore && communityAverageScore
              ? (adminAverageScore + communityAverageScore) / 2
              : adminAverageScore || communityAverageScore;

          return { foodItem: item, overallAverageScore };
        })
      );

      return scores.sort(
        (a, b) => b.overallAverageScore - a.overallAverageScore
      );
    };

    const rankedItems = await rankByScore(foodItems);

    res.json(rankedItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ranked list of food items by category and optionally by subCategory
router.get("/rank/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { subCategory } = req.query;

    let filter = { type: category };

    // If subCategory is provided, add it to the filter
    if (subCategory) {
      filter.subType = subCategory;
    }

    // Find food items by category and optional subCategory
    const foodItems = await FoodItem.find(filter);

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found for the provided criteria` });
    }

    const rankByScore = async (items) => {
      const scores = await Promise.all(
        items.map(async (item) => {
          const adminReviews = await Review.find({
            foodItem: item._id,
            userRole: "admin",
          });
          const communityReviews = await Review.find({
            foodItem: item._id,
            userRole: "user",
          });

          const adminScore =
            adminReviews.length > 0
              ? adminReviews.reduce((sum, review) => sum + review.score, 0) /
                adminReviews.length
              : null;

          const communityScore =
            communityReviews.length > 0
              ? communityReviews.reduce(
                  (sum, review) => sum + review.score,
                  0
                ) / communityReviews.length
              : null;

          let scoreCount = 0;
          let totalScore = 0;

          if (adminScore !== null) {
            totalScore += adminScore;
            scoreCount++;
          }

          if (communityScore !== null) {
            totalScore += communityScore;
            scoreCount++;
          }

          const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

          return { foodItem: item, averageScore };
        })
      );
      return scores.sort((a, b) => b.averageScore - a.averageScore);
    };

    const rankedItems = await rankByScore(foodItems);

    res.json(rankedItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ranked list of food items by category or subcategory and city
router.get("/rank/category/:category/city/:city", async (req, res) => {
  try {
    const { category, city } = req.params;
    const { subCategory } = req.query;

    // Find all addresses in the specified city
    const addresses = await Address.find({ city: city });
    const addressIds = addresses.map((address) => address._id);

    // Find all restaurants in those addresses
    const restaurants = await Restaurant.find({
      address: { $in: addressIds },
    }).populate("address");
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    // Construct the query to find food items based on category or subcategory
    const query = subCategory
      ? {
          subType: new RegExp(subCategory, "i"),
          restaurant: { $in: restaurantIds },
        }
      : { type: new RegExp(category, "i"), restaurant: { $in: restaurantIds } };

    const foodItems = await FoodItem.find(query).populate("restaurant");

    if (!foodItems || foodItems.length === 0) {
      return res.status(404).json({
        message: `No food items found for the provided criteria in city: ${city}`,
      });
    }

    // Respond with the found food items
    res.status(200).json(foodItems);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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

    // Correct the query to ensure the category is passed as a string and applied
    const query = subCategory
      ? {
          subType: new RegExp(subCategory, "i"),
          restaurant: { $in: restaurantIds },
        }
      : { type: new RegExp(category, "i"), restaurant: { $in: restaurantIds } };

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
      const itemAdminReviews = reviews.filter(
        (review) =>
          review.foodItem.toString() === item._id.toString() &&
          review.userRole === "admin"
      );
      const itemCommunityReviews = reviews.filter(
        (review) =>
          review.foodItem.toString() === item._id.toString() &&
          review.userRole !== "admin"
      );

      const totalAdminScore = itemAdminReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );
      const totalCommunityScore = itemCommunityReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );

      const adminAverageScore = itemAdminReviews.length
        ? totalAdminScore / itemAdminReviews.length
        : 0;
      const communityAverageScore = itemCommunityReviews.length
        ? totalCommunityScore / itemCommunityReviews.length
        : 0;

      // Only include non-zero scores in the overall average
      const overallAverageScore =
        adminAverageScore > 0 && communityAverageScore > 0
          ? (adminAverageScore + communityAverageScore) / 2
          : adminAverageScore || communityAverageScore;

      return {
        foodItem: item,
        adminAverageScore,
        communityAverageScore,
        overallAverageScore,
      };
    });

    const rankedList = scores.sort(
      (a, b) => b.overallAverageScore - a.overallAverageScore
    );

    res.status(200).json(rankedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ranked list of food items by category or subcategory and country
router.get("/rank/category/:category/country/:country", async (req, res) => {
  try {
    const { category, country } = req.params;
    const { subCategory } = req.query;

    // Find all addresses in the specified country
    const addresses = await Address.find({ country: country });
    const addressIds = addresses.map((address) => address._id);

    // Find all restaurants in those addresses
    const restaurants = await Restaurant.find({ address: { $in: addressIds } });
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    // Construct the query to find food items based on category or subcategory
    const query = subCategory
      ? { subType: subCategory, restaurant: { $in: restaurantIds } }
      : { type: category, restaurant: { $in: restaurantIds } };

    // Find all food items that match the query
    const foodItems = await FoodItem.find(query);

    if (!foodItems || foodItems.length === 0) {
      return res.status(404).json({
        message: `No food items found for the provided criteria in country: ${country}`,
      });
    }

    // Get all reviews for the found food items
    const foodItemIds = foodItems.map((item) => item._id);
    const reviews = await Review.find({ foodItem: { $in: foodItemIds } });

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({
        message: `No reviews found for the provided criteria in country: ${country}`,
      });
    }

    // Calculate scores for each food item
    const scores = foodItems.map((item) => {
      const itemAdminReviews = reviews.filter(
        (review) =>
          review.foodItem.toString() === item._id.toString() &&
          review.userRole === "admin"
      );
      const itemCommunityReviews = reviews.filter(
        (review) =>
          review.foodItem.toString() === item._id.toString() &&
          review.userRole !== "admin"
      );

      const totalAdminScore = itemAdminReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );
      const totalCommunityScore = itemCommunityReviews.reduce(
        (sum, review) => sum + review.score,
        0
      );

      // Calculate average scores, ignoring zero scores
      const adminAverageScore = itemAdminReviews.length
        ? totalAdminScore / itemAdminReviews.length
        : 0;
      const communityAverageScore = itemCommunityReviews.length
        ? totalCommunityScore / itemCommunityReviews.length
        : 0;

      const overallAverageScore =
        (adminAverageScore + communityAverageScore) / 2;

      return {
        foodItem: item,
        adminAverageScore,
        communityAverageScore,
        overallAverageScore,
      };
    });

    // Rank the food items based on overall average score
    const rankedList = scores.sort(
      (a, b) => b.overallAverageScore - a.overallAverageScore
    );

    // Return the ranked list
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

    // Fetch all food items within the specified category
    const foodItems = await FoodItem.find({ type: foodCategory });

    if (!foodItems || foodItems.length === 0) {
      return res
        .status(404)
        .json({ message: `No food items found for ${foodCategory}` });
    }

    // Get the price categorization boundaries
    const prices = foodItems.map((item) => item.price);
    const { lowPrice, highPrice } = categorizePrices(prices);

    console.log(`Prices for category ${foodCategory}: `, prices);
    console.log(
      `Price range boundaries - Low: ${lowPrice}, High: ${highPrice}`
    );

    // Filter the food items based on the specified price range
    let filteredItems;
    if (range === "budget") {
      filteredItems = foodItems.filter((item) => item.price <= lowPrice);
      console.log("Filtered budget items: ", filteredItems);
    } else if (range === "mid-range") {
      filteredItems = foodItems.filter(
        (item) => item.price > lowPrice && item.price <= highPrice
      );
      console.log("Filtered mid-range items: ", filteredItems);
    } else if (range === "high-end") {
      filteredItems = foodItems.filter((item) => item.price > highPrice);
      console.log("Filtered high-end items: ", filteredItems);
    } else {
      return res.status(400).json({ message: "Invalid price range specified" });
    }

    // If no items were found in the selected range
    if (!filteredItems || filteredItems.length === 0) {
      return res.status(404).json({
        message: `No food items found in the ${range} price range for ${foodCategory}`,
      });
    }

    // Rank items by their scores
    const rankByScore = async (items) => {
      const scores = await Promise.all(
        items.map(async (item) => {
          const reviews = await Review.find({ foodItem: item._id });

          const adminReviews = reviews.filter(
            (review) => review.userRole === "admin"
          );
          const communityReviews = reviews.filter(
            (review) => review.userRole !== "admin"
          );

          const totalAdminScore = adminReviews.reduce(
            (sum, review) => sum + review.score,
            0
          );
          const totalCommunityScore = communityReviews.reduce(
            (sum, review) => sum + review.score,
            0
          );

          const adminAverageScore = adminReviews.length
            ? totalAdminScore / adminReviews.length
            : 0;
          const communityAverageScore = communityReviews.length
            ? totalCommunityScore / communityReviews.length
            : 0;

          const overallAverageScore =
            adminReviews.length && communityReviews.length
              ? (adminAverageScore + communityAverageScore) / 2
              : adminReviews.length
              ? adminAverageScore
              : communityReviews.length
              ? communityAverageScore
              : 0;

          return { item, overallAverageScore };
        })
      );

      return scores
        .sort((a, b) => b.overallAverageScore - a.overallAverageScore)
        .map((score) => score.item);
    };

    // Rank the filtered items
    const rankedItems = await rankByScore(filteredItems);

    console.log(`Ranked items for ${range} price range: `, rankedItems);

    res.json({ range, rankedItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ranked lists of food items by price range and city
router.get(
  "/rank/category/:foodCategory/price-range/city/:city",
  async (req, res) => {
    try {
      const { foodCategory, city } = req.params;
      const { range } = req.query;

      // Find all addresses in the specified city
      const addresses = await Address.find({ city: city });
      const addressIds = addresses.map((address) => address._id);

      // Find all restaurants in those addresses
      const restaurants = await Restaurant.find({
        address: { $in: addressIds },
      });
      const restaurantIds = restaurants.map((restaurant) => restaurant._id);

      // Fetch all food items within the specified category and restaurants in the city
      const foodItems = await FoodItem.find({
        type: foodCategory,
        restaurant: { $in: restaurantIds },
      });

      if (!foodItems || foodItems.length === 0) {
        return res.status(404).json({
          message: `No food items found for ${foodCategory} in city ${city}`,
        });
      }

      // Get the price categorization boundaries
      const prices = foodItems.map((item) => item.price);
      const { lowPrice, highPrice } = categorizePrices(prices);

      // Filter the food items based on the specified price range
      let filteredItems;
      if (range === "budget") {
        filteredItems = foodItems.filter((item) => item.price <= lowPrice);
      } else if (range === "mid-range") {
        filteredItems = foodItems.filter(
          (item) => item.price > lowPrice && item.price <= highPrice
        );
      } else if (range === "high-end") {
        filteredItems = foodItems.filter((item) => item.price > highPrice);
      } else {
        return res
          .status(400)
          .json({ message: "Invalid price range specified" });
      }

      const rankByScore = async (items) => {
        const scores = await Promise.all(
          items.map(async (item) => {
            const reviews = await Review.find({ foodItem: item._id });

            const adminReviews = reviews.filter(
              (review) => review.userRole === "admin"
            );
            const communityReviews = reviews.filter(
              (review) => review.userRole !== "admin"
            );

            const totalAdminScore = adminReviews.reduce(
              (sum, review) => sum + review.score,
              0
            );
            const totalCommunityScore = communityReviews.reduce(
              (sum, review) => sum + review.score,
              0
            );

            const adminAverageScore = adminReviews.length
              ? totalAdminScore / adminReviews.length
              : 0;
            const communityAverageScore = communityReviews.length
              ? totalCommunityScore / communityReviews.length
              : 0;

            const overallAverageScore =
              adminAverageScore && communityAverageScore
                ? (adminAverageScore + communityAverageScore) / 2
                : adminAverageScore || communityAverageScore;

            return { item, overallAverageScore };
          })
        );

        return scores
          .sort((a, b) => b.overallAverageScore - a.overallAverageScore)
          .map((score) => score.item);
      };

      const rankedItems = await rankByScore(filteredItems);
      res.json({ range, rankedItems });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get ranked lists of food items by price range and province
router.get(
  "/rank/category/:foodCategory/price-range/province/:province",
  async (req, res) => {
    try {
      const { foodCategory, province } = req.params;
      const { range } = req.query;

      // Find all addresses in the specified province
      const addresses = await Address.find({ province: province });
      const addressIds = addresses.map((address) => address._id);

      // Find all restaurants in those addresses
      const restaurants = await Restaurant.find({
        address: { $in: addressIds },
      });
      const restaurantIds = restaurants.map((restaurant) => restaurant._id);

      // Fetch all food items within the specified category and restaurants in the province
      const foodItems = await FoodItem.find({
        type: foodCategory,
        restaurant: { $in: restaurantIds },
      });

      if (!foodItems || foodItems.length === 0) {
        return res.status(404).json({
          message: `No food items found for ${foodCategory} in province ${province}`,
        });
      }

      // Get the price categorization boundaries
      const prices = foodItems.map((item) => item.price);
      const { lowPrice, highPrice } = categorizePrices(prices);

      // Filter the food items based on the specified price range
      let filteredItems;
      if (range === "budget") {
        filteredItems = foodItems.filter((item) => item.price <= lowPrice);
      } else if (range === "mid-range") {
        filteredItems = foodItems.filter(
          (item) => item.price > lowPrice && item.price <= highPrice
        );
      } else if (range === "high-end") {
        filteredItems = foodItems.filter((item) => item.price > highPrice);
      } else {
        return res
          .status(400)
          .json({ message: "Invalid price range specified" });
      }

      const rankByScore = async (items) => {
        const scores = await Promise.all(
          items.map(async (item) => {
            const reviews = await Review.find({ foodItem: item._id });

            const adminReviews = reviews.filter(
              (review) => review.userRole === "admin"
            );
            const communityReviews = reviews.filter(
              (review) => review.userRole !== "admin"
            );

            const totalAdminScore = adminReviews.reduce(
              (sum, review) => sum + review.score,
              0
            );
            const totalCommunityScore = communityReviews.reduce(
              (sum, review) => sum + review.score,
              0
            );

            const adminAverageScore = adminReviews.length
              ? totalAdminScore / adminReviews.length
              : 0;
            const communityAverageScore = communityReviews.length
              ? totalCommunityScore / communityReviews.length
              : 0;

            const overallAverageScore =
              adminAverageScore && communityAverageScore
                ? (adminAverageScore + communityAverageScore) / 2
                : adminAverageScore || communityAverageScore;

            return { item, overallAverageScore };
          })
        );

        return scores
          .sort((a, b) => b.overallAverageScore - a.overallAverageScore)
          .map((score) => score.item);
      };

      const rankedItems = await rankByScore(filteredItems);

      res.json({ range, rankedItems });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get ranked lists of food items by price range and country
router.get(
  "/rank/category/:foodCategory/price-range/country/:country",
  async (req, res) => {
    try {
      const { foodCategory, country } = req.params;
      const { range } = req.query;

      // Find all addresses in the specified country
      const addresses = await Address.find({ country: country });
      const addressIds = addresses.map((address) => address._id);

      // Find all restaurants in those addresses
      const restaurants = await Restaurant.find({
        address: { $in: addressIds },
      });
      const restaurantIds = restaurants.map((restaurant) => restaurant._id);

      // Fetch all food items within the specified category and restaurants in the country
      const foodItems = await FoodItem.find({
        type: foodCategory,
        restaurant: { $in: restaurantIds },
      });

      if (!foodItems || foodItems.length === 0) {
        return res.status(404).json({
          message: `No food items found for ${foodCategory} in country ${country}`,
        });
      }

      // Get the price categorization boundaries
      const prices = foodItems.map((item) => item.price);
      const { lowPrice, highPrice } = categorizePrices(prices);

      // Filter the food items based on the specified price range
      let filteredItems;
      if (range === "budget") {
        filteredItems = foodItems.filter((item) => item.price <= lowPrice);
      } else if (range === "mid-range") {
        filteredItems = foodItems.filter(
          (item) => item.price > lowPrice && item.price <= highPrice
        );
      } else if (range === "high-end") {
        filteredItems = foodItems.filter((item) => item.price > highPrice);
      } else {
        return res
          .status(400)
          .json({ message: "Invalid price range specified" });
      }

      const rankByScore = async (items) => {
        const scores = await Promise.all(
          items.map(async (item) => {
            const reviews = await Review.find({ foodItem: item._id });

            const adminReviews = reviews.filter(
              (review) => review.userRole === "admin"
            );
            const communityReviews = reviews.filter(
              (review) => review.userRole !== "admin"
            );

            const totalAdminScore = adminReviews.reduce(
              (sum, review) => sum + review.score,
              0
            );
            const totalCommunityScore = communityReviews.reduce(
              (sum, review) => sum + review.score,
              0
            );

            const adminAverageScore = adminReviews.length
              ? totalAdminScore / adminReviews.length
              : 0;
            const communityAverageScore = communityReviews.length
              ? totalCommunityScore / communityReviews.length
              : 0;

            const overallAverageScore =
              adminAverageScore && communityAverageScore
                ? (adminAverageScore + communityAverageScore) / 2
                : adminAverageScore || communityAverageScore;

            return { item, overallAverageScore };
          })
        );

        return scores
          .sort((a, b) => b.overallAverageScore - a.overallAverageScore)
          .map((score) => score.item);
      };

      const rankedItems = await rankByScore(filteredItems);

      res.json({ range, rankedItems });
    } catch (err) {
      console.error(`Error occurred: ${err.message}`, err.stack); // Log the error message and stack
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// // Filter food items based on rating, price range, and type
// router.get("/food-items/filter", async (req, res) => {
//   try {
//     const { rating, price, type } = req.query;

//     // Building the price range query
//     let priceQuery = {};
//     if (price === "low") {
//       priceQuery = { price: { $lte: 10 } };
//     } else if (price === "mid") {
//       priceQuery = { price: { $gt: 10, $lte: 30 } };
//     } else if (price === "high") {
//       priceQuery = { price: { $gt: 30 } };
//     }

//     // Constructing the type filter, optional check for 'type'
//     let typeQuery = {};
//     if (type) {
//       typeQuery = { type: type };
//     }

//     // Finding the food items that match the type and price query
//     const foodItems = await FoodItem.find({
//       ...typeQuery,
//       ...priceQuery,
//     });

//     if (!foodItems || foodItems.length === 0) {
//       return res.status(404).json({ message: "No food items found" });
//     }

//     // Filtering by rating (if given) using both admin and community scores
//     const filteredItems = foodItems.filter((item) => {
//       const avgRating =
//         (item.adminScore + item.communityScore) / 2 ||
//         item.adminScore ||
//         item.communityScore;
//       return !rating || avgRating >= parseFloat(rating);
//     });

//     res.status(200).json(filteredItems);
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

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
