const express = require("express");
const mongoose = require("mongoose");
const Restaurant = require("../models/Restaurant");
const FoodItem = require("../models/FoodItem");
const Address = require("../models/Address");

const router = express.Router();

// Helper function to calculate overall average score for food items
const calculateOverallScore = (adminScore, communityScore) => {
  if (adminScore > 0 && communityScore > 0) {
    return (adminScore + communityScore) / 2;
  }
  return adminScore > 0 ? adminScore : communityScore > 0 ? communityScore : 0;
};

// Calculate best restaurants globally
const calculateBestRestaurants = async () => {
  try {
    const restaurants = await Restaurant.aggregate([
      {
        $lookup: {
          from: "addresses",
          localField: "address",
          foreignField: "_id",
          as: "address",
        },
      },
      {
        $unwind: "$address",
      },
      {
        $lookup: {
          from: "fooditems",
          localField: "_id",
          foreignField: "restaurant",
          as: "foodItems",
        },
      },
      {
        $match: {
          foodItems: { $ne: [] }, // Only include restaurants that have food items
        },
      },
      {
        $addFields: {
          avgScore: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: "$foodItems",
                    cond: {
                      $or: [
                        { $gt: ["$$this.adminScore", 0] },
                        { $gt: ["$$this.communityScore", 0] },
                      ],
                    },
                  },
                },
                as: "item",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $gt: ["$$item.adminScore", 0] },
                        { $gt: ["$$item.communityScore", 0] },
                      ],
                    },
                    then: {
                      $divide: [
                        {
                          $add: ["$$item.adminScore", "$$item.communityScore"],
                        },
                        2,
                      ],
                    },
                    else: {
                      $cond: {
                        if: { $gt: ["$$item.adminScore", 0] },
                        then: "$$item.adminScore",
                        else: "$$item.communityScore",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $match: {
          avgScore: { $exists: true, $gt: 0 },
        },
      },
      {
        $sort: { avgScore: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: 1,
          type: 1,
          cuisine: 1,
          address: 1,
          adminScore: { $round: ["$avgScore", 0] },
          overallScore: { $round: ["$avgScore", 0] },
          hasValidScore: true,
        },
      },
    ]);

    console.log(`Found ${restaurants.length} best restaurants`);
    return restaurants;
  } catch (error) {
    console.error("Error calculating best restaurants:", error);
    return [];
  }
};

// Calculate best cities globally
const calculateBestCities = async () => {
  try {
    const cities = await Restaurant.aggregate([
      {
        $lookup: {
          from: "addresses",
          localField: "address",
          foreignField: "_id",
          as: "address",
        },
      },
      {
        $unwind: "$address",
      },
      {
        $lookup: {
          from: "fooditems",
          localField: "_id",
          foreignField: "restaurant",
          as: "foodItems",
        },
      },
      {
        $match: {
          foodItems: { $ne: [] }, // Only include restaurants that have food items
        },
      },
      {
        $addFields: {
          restaurantScore: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: "$foodItems",
                    cond: {
                      $or: [
                        { $gt: ["$$this.adminScore", 0] },
                        { $gt: ["$$this.communityScore", 0] },
                      ],
                    },
                  },
                },
                as: "item",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $gt: ["$$item.adminScore", 0] },
                        { $gt: ["$$item.communityScore", 0] },
                      ],
                    },
                    then: {
                      $divide: [
                        {
                          $add: ["$$item.adminScore", "$$item.communityScore"],
                        },
                        2,
                      ],
                    },
                    else: {
                      $cond: {
                        if: { $gt: ["$$item.adminScore", 0] },
                        then: "$$item.adminScore",
                        else: "$$item.communityScore",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $match: {
          restaurantScore: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            city: "$address.city",
            province: "$address.province",
            country: "$address.country",
          },
          restaurants: {
            $push: {
              id: "$_id",
              name: "$name",
              score: "$restaurantScore",
              type: "$type",
            },
          },
          totalScore: { $sum: "$restaurantScore" },
          restaurantCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          avgScore: { $divide: ["$totalScore", "$restaurantCount"] },
        },
      },
      {
        $sort: { avgScore: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: { $concat: ["city_", "$_id.city", "_", "$_id.province"] },
          name: { $concat: ["$_id.city", ", ", "$_id.province"] },
          city: "$_id.city",
          province: "$_id.province",
          country: "$_id.country",
          adminScore: { $round: ["$avgScore", 0] },
          restaurantCount: 1,
        },
      },
    ]);

    console.log(`Found ${cities.length} best cities`);
    return cities;
  } catch (error) {
    console.error("Error calculating best cities:", error);
    return [];
  }
};

// Calculate best food items by type
const calculateBestFoodItems = async (foodType) => {
  try {
    const foodItems = await FoodItem.aggregate([
      {
        $match: {
          type: foodType,
          $or: [{ adminScore: { $gt: 0 } }, { communityScore: { $gt: 0 } }],
        },
      },
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurant",
          foreignField: "_id",
          as: "restaurant",
        },
      },
      {
        $unwind: "$restaurant",
      },
      {
        $lookup: {
          from: "addresses",
          localField: "restaurant.address",
          foreignField: "_id",
          as: "restaurant.address",
        },
      },
      {
        $unwind: "$restaurant.address",
      },
      {
        $addFields: {
          calculatedScore: {
            $cond: {
              if: {
                $and: [
                  { $gt: ["$adminScore", 0] },
                  { $gt: ["$communityScore", 0] },
                ],
              },
              then: {
                $divide: [{ $add: ["$adminScore", "$communityScore"] }, 2],
              },
              else: {
                $cond: {
                  if: { $gt: ["$adminScore", 0] },
                  then: "$adminScore",
                  else: "$communityScore",
                },
              },
            },
          },
        },
      },
      {
        $sort: { calculatedScore: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: 1,
          type: 1,
          price: 1,
          restaurant: {
            _id: "$restaurant._id",
            name: "$restaurant.name",
            address: "$restaurant.address",
          },
          overallAverageScore: { $round: ["$calculatedScore", 0] },
        },
      },
    ]);

    console.log(`Found ${foodItems.length} best ${foodType} items`);
    return foodItems;
  } catch (error) {
    console.error(`Error calculating best ${foodType}:`, error);
    return [];
  }
};

// Calculate best overall food items
const calculateBestOverallFood = async () => {
  try {
    const foodItems = await FoodItem.aggregate([
      {
        $match: {
          $or: [{ adminScore: { $gt: 0 } }, { communityScore: { $gt: 0 } }],
        },
      },
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurant",
          foreignField: "_id",
          as: "restaurant",
        },
      },
      {
        $unwind: "$restaurant",
      },
      {
        $lookup: {
          from: "addresses",
          localField: "restaurant.address",
          foreignField: "_id",
          as: "restaurant.address",
        },
      },
      {
        $unwind: "$restaurant.address",
      },
      {
        $addFields: {
          calculatedScore: {
            $cond: {
              if: {
                $and: [
                  { $gt: ["$adminScore", 0] },
                  { $gt: ["$communityScore", 0] },
                ],
              },
              then: {
                $divide: [{ $add: ["$adminScore", "$communityScore"] }, 2],
              },
              else: {
                $cond: {
                  if: { $gt: ["$adminScore", 0] },
                  then: "$adminScore",
                  else: "$communityScore",
                },
              },
            },
          },
        },
      },
      {
        $sort: { calculatedScore: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: 1,
          type: 1,
          price: 1,
          restaurant: {
            _id: "$restaurant._id",
            name: "$restaurant.name",
            address: "$restaurant.address",
          },
          overallAverageScore: { $round: ["$calculatedScore", 0] },
        },
      },
    ]);

    console.log(`Found ${foodItems.length} best overall food items`);
    return foodItems;
  } catch (error) {
    console.error("Error calculating best overall food:", error);
    return [];
  }
};

// Calculate best restaurants by cuisine - FIXED with flexible matching
const calculateBestCuisine = async (cuisineType) => {
  try {
    console.log(`Searching for ${cuisineType} restaurants...`);

    const restaurants = await Restaurant.aggregate([
      {
        $match: {
          // Use regex for flexible matching instead of exact match
          cuisine: { $regex: new RegExp(cuisineType, "i") },
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "address",
          foreignField: "_id",
          as: "address",
        },
      },
      {
        $unwind: "$address",
      },
      {
        $lookup: {
          from: "fooditems",
          localField: "_id",
          foreignField: "restaurant",
          as: "foodItems",
        },
      },
      {
        $match: {
          foodItems: { $ne: [] }, // Only include restaurants that have food items
        },
      },
      {
        $addFields: {
          avgScore: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: "$foodItems",
                    cond: {
                      $or: [
                        { $gt: ["$$this.adminScore", 0] },
                        { $gt: ["$$this.communityScore", 0] },
                      ],
                    },
                  },
                },
                as: "item",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $gt: ["$$item.adminScore", 0] },
                        { $gt: ["$$item.communityScore", 0] },
                      ],
                    },
                    then: {
                      $divide: [
                        {
                          $add: ["$$item.adminScore", "$$item.communityScore"],
                        },
                        2,
                      ],
                    },
                    else: {
                      $cond: {
                        if: { $gt: ["$$item.adminScore", 0] },
                        then: "$$item.adminScore",
                        else: "$$item.communityScore",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $match: {
          avgScore: { $exists: true, $gt: 0 },
        },
      },
      {
        $sort: { avgScore: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: 1,
          type: 1,
          cuisine: 1,
          address: 1,
          adminScore: { $round: ["$avgScore", 0] },
          overallScore: { $round: ["$avgScore", 0] },
          hasValidScore: true,
        },
      },
    ]);

    console.log(`Found ${restaurants.length} best ${cuisineType} restaurants`);
    return restaurants;
  } catch (error) {
    console.error(`Error calculating best ${cuisineType} restaurants:`, error);
    return [];
  }
};

// GET /api/leaderboards/global - Get all global leaderboards
router.get("/global", async (req, res) => {
  try {
    console.log("Fetching global leaderboards...");

    // Calculate all leaderboards in parallel for speed
    const [
      bestCities,
      bestRestaurants,
      bestOverallFood,
      bestBurgers,
      bestPizza,
      bestTacos,
      bestBurritos,
      bestHotDogs,
      bestFries,
      bestDesserts,
      bestAmerican,
      bestItalian,
      bestVietnamese,
      bestMexican,
      bestFastFood,
      bestAsian,
    ] = await Promise.all([
      calculateBestCities(),
      calculateBestRestaurants(),
      calculateBestOverallFood(),
      calculateBestFoodItems("Burger"),
      calculateBestFoodItems("Pizza"),
      calculateBestFoodItems("Tacos"),
      calculateBestFoodItems("Burrito"),
      calculateBestFoodItems("Hot Dog"),
      calculateBestFoodItems("Fries"),
      calculateBestFoodItems("Churro"),
      calculateBestCuisine("American"),
      calculateBestCuisine("Italian"),
      calculateBestCuisine("Vietnamese"),
      calculateBestCuisine("Mexican"),
      calculateBestCuisine("Fast Food"),
      calculateBestCuisine("Asian"),
    ]);

    const leaderboards = {
      bestCities,
      bestRestaurants,
      bestOverallFood,
      bestBurgers,
      bestPizza,
      bestTacos,
      bestBurritos,
      bestHotDogs,
      bestFries,
      bestDesserts,
      bestAmerican,
      bestItalian,
      bestVietnamese,
      bestMexican,
      bestFastFood,
      bestAsian,
    };

    console.log("Global leaderboards calculated successfully");
    console.log(
      "Summary:",
      Object.fromEntries(
        Object.entries(leaderboards).map(([key, value]) => [
          key,
          `${value.length} items`,
        ])
      )
    );

    res.json(leaderboards);
  } catch (error) {
    console.error("Error fetching global leaderboards:", error);
    res.status(500).json({ error: "Failed to fetch global leaderboards" });
  }
});

// GET /api/leaderboards/cities - Get best cities leaderboard
router.get("/cities", async (req, res) => {
  try {
    const cities = await calculateBestCities();
    res.json(cities);
  } catch (error) {
    console.error("Error fetching cities leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch cities leaderboard" });
  }
});

// GET /api/leaderboards/restaurants - Get best restaurants leaderboard
router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await calculateBestRestaurants();
    res.json(restaurants);
  } catch (error) {
    console.error("Error fetching restaurants leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch restaurants leaderboard" });
  }
});

// GET /api/leaderboards/food-items/:type - Get best food items by type
router.get("/food-items/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const foodItems = await calculateBestFoodItems(type);
    res.json(foodItems);
  } catch (error) {
    console.error(`Error fetching ${req.params.type} leaderboard:`, error);
    res
      .status(500)
      .json({ error: `Failed to fetch ${req.params.type} leaderboard` });
  }
});

// GET /api/leaderboards/cuisine/:type - Get best restaurants by cuisine
router.get("/cuisine/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const restaurants = await calculateBestCuisine(type);
    res.json(restaurants);
  } catch (error) {
    console.error(
      `Error fetching ${req.params.type} cuisine leaderboard:`,
      error
    );
    res.status(500).json({
      error: `Failed to fetch ${req.params.type} cuisine leaderboard`,
    });
  }
});

module.exports = router;
