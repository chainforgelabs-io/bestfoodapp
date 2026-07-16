/**
 * Leaderboard aggregations: global and city-scoped top restaurants / food items.
 * Overall score blends admin and community when both exist; otherwise uses whichever is set.
 */
const express = require("express");
const mongoose = require("mongoose");
const Restaurant = require("../models/Restaurant");
const FoodItem = require("../models/FoodItem");
const Address = require("../models/Address");

const router = express.Router();

// Prefer the mean of admin + community when both are present; else the non-zero score.
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
      bestBreakfastFood,
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
      calculateBestCuisine("Breakfast"),
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
      bestBreakfastFood,
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

// GET /api/leaderboards/categories - Get all available categories from database
router.get("/categories", async (req, res) => {
  try {
    const { city, province, country } = req.query;

    let query = {};
    if (city) {
      // If city is specified, filter by location
      const addresses = await Address.find({
        ...(city && { city: new RegExp(city, "i") }),
        // Temporarily remove province/country filtering to match main filtering
        // ...(province && { province: new RegExp(province, "i") }),
        // ...(country && { country: new RegExp(country, "i") }),
      });
      const addressIds = addresses.map((addr) => addr._id);
      console.log(
        `Categories: Found ${addresses.length} addresses for ${city}`
      );

      const restaurants = await Restaurant.find({
        address: { $in: addressIds },
      });
      const restaurantIds = restaurants.map((r) => r._id);
      console.log(
        `Categories: Found ${restaurants.length} restaurants:`,
        restaurants.map((r) => ({ id: r._id, name: r.name }))
      );

      query = { restaurant: { $in: restaurantIds } };

      // Debug: Check all food items for these restaurants
      const allFoodItems = await FoodItem.find(query);
      console.log(`Categories: Found ${allFoodItems.length} total food items`);
      console.log(
        "Categories: Food items by restaurant:",
        restaurantIds.map((rid) => ({
          restaurant: restaurants.find((r) => r._id.equals(rid))?.name,
          foodCount: allFoodItems.filter((f) => f.restaurant.equals(rid))
            .length,
          foodTypes: allFoodItems
            .filter((f) => f.restaurant.equals(rid))
            .map((f) => f.type),
        }))
      );
    }

    // Get unique food types, categories, subtypes
    const [foodTypes, categories, subTypes, cuisineTypes, restaurantTypes] =
      await Promise.all([
        FoodItem.distinct("type", query),
        FoodItem.distinct("category", query),
        FoodItem.distinct("subType", query),
        Restaurant.distinct("cuisine"),
        Restaurant.distinct("type"),
      ]);

    console.log("Categories: Raw distinct results:", {
      foodTypes,
      categories,
      subTypes,
    });

    // Filter out null/undefined values and sort
    const result = {
      foodTypes: foodTypes.filter(Boolean).sort(),
      categories: categories.filter(Boolean).sort(),
      subTypes: subTypes.filter(Boolean).sort(),
      cuisineTypes: cuisineTypes.flat().filter(Boolean).sort(),
      restaurantTypes: restaurantTypes.filter(Boolean).sort(),
    };

    console.log("Categories: Final result:", result);
    res.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/leaderboards/filtered - Advanced filtering for city-specific data
router.get("/filtered", async (req, res) => {
  try {
    const {
      city,
      province,
      country,
      category,
      foodType,
      subType,
      cuisine,
      restaurantType,
    } = req.query;

    console.log("Filtering request:", {
      city,
      province,
      country,
      category,
      cuisine,
      restaurantType,
      foodType,
      subType,
    });

    // Find addresses in the specified location
    const addressQuery = {
      ...(city && { city: new RegExp(city, "i") }),
      // Temporarily remove province/country filtering to debug
      // ...(province && { province: new RegExp(province, "i") }),
      // ...(country && { country: new RegExp(country, "i") }),
    };

    const addresses = await Address.find(addressQuery);
    const addressIds = addresses.map((addr) => addr._id);
    console.log(`Found ${addresses.length} addresses in ${city}`);
    console.log(
      "Address details:",
      addresses.map((addr) => ({
        id: addr._id,
        city: addr.city,
        street: addr.street,
      }))
    );

    // Build restaurant query - make cuisine filtering more permissive
    const restaurantQuery = {
      address: { $in: addressIds },
      // Only filter by cuisine if it's specifically provided (not "All")
      ...(cuisine &&
        cuisine !== "All" && {
          cuisine: { $regex: new RegExp(cuisine, "i") },
        }),
      ...(restaurantType && {
        type: { $regex: new RegExp(restaurantType, "i") },
      }),
    };

    console.log("Restaurant query:", restaurantQuery);

    const restaurants = await Restaurant.find(restaurantQuery).populate(
      "address"
    );
    console.log(`Found ${restaurants.length} restaurants after filtering`);
    console.log(
      "Restaurant details:",
      restaurants.map((r) => ({
        id: r._id,
        name: r.name,
        addressId: r.address,
      }))
    );

    // Let's also check how many total restaurants exist with ANY address in this city
    const allAddressesInCity = await Address.find({
      city: new RegExp(city, "i"),
    });
    const allAddressIdsInCity = allAddressesInCity.map((addr) => addr._id);
    const allRestaurantsInCity = await Restaurant.find({
      address: { $in: allAddressIdsInCity },
    });
    console.log(
      `DEBUG: Total addresses in ${city}: ${allAddressesInCity.length}`
    );
    console.log(
      `DEBUG: Total restaurants in ${city}: ${allRestaurantsInCity.length}`
    );
    console.log(
      `DEBUG: All restaurant names in ${city}:`,
      allRestaurantsInCity.map((r) => r.name)
    );

    if (category === "restaurants" || category === "cuisines") {
      // Return restaurants with calculated scores
      const restaurantsWithScores = await Promise.all(
        restaurants.map(async (restaurant) => {
          try {
            const foodItems = await FoodItem.find({
              restaurant: restaurant._id,
            });

            if (foodItems.length === 0) {
              return {
                ...restaurant._doc,
                adminScore: null,
                communityScore: null,
                overallScore: null,
                hasValidScore: false,
              };
            }

            let totalScore = 0;
            let validScores = 0;

            foodItems.forEach((item) => {
              const itemScore = calculateOverallScore(
                item.adminScore,
                item.communityScore
              );
              if (itemScore > 0) {
                totalScore += itemScore;
                validScores++;
              }
            });

            if (validScores > 0) {
              const avgScore = totalScore / validScores;
              return {
                ...restaurant._doc,
                adminScore: Math.round(avgScore),
                communityScore: 0,
                overallScore: Math.round(avgScore),
                hasValidScore: true,
              };
            }

            return {
              ...restaurant._doc,
              adminScore: null,
              communityScore: null,
              overallScore: null,
              hasValidScore: false,
            };
          } catch (error) {
            console.error(
              `Error calculating score for restaurant ${restaurant._id}:`,
              error
            );
            return {
              ...restaurant._doc,
              adminScore: null,
              communityScore: null,
              overallScore: null,
              hasValidScore: false,
            };
          }
        })
      );

      // Show restaurants with valid scores first, then those without
      const withScores = restaurantsWithScores.filter((r) => r.hasValidScore);
      const withoutScores = restaurantsWithScores.filter(
        (r) => !r.hasValidScore
      );

      const sortedWithScores = withScores.sort(
        (a, b) => (b.overallScore || 0) - (a.overallScore || 0)
      );

      // Combine: scored restaurants first, then unscored ones
      const finalResults = [...sortedWithScores, ...withoutScores].slice(0, 10);

      console.log(
        `Returning ${finalResults.length} restaurants (${withScores.length} with scores, ${withoutScores.length} without)`
      );
      res.json(finalResults);
    } else if (category === "food-items") {
      // Build food item query
      const foodQuery = {
        restaurant: { $in: restaurants.map((r) => r._id) },
        ...(foodType &&
          foodType !== "All" && {
            type: { $regex: new RegExp(foodType, "i") },
          }),
        ...(subType &&
          subType !== "All" && {
            subType: { $regex: new RegExp(subType, "i") },
          }),
      };

      console.log("Food item query:", foodQuery);

      const foodItems = await FoodItem.find(foodQuery).populate({
        path: "restaurant",
        populate: { path: "address" },
      });

      // Calculate scores and sort
      const scoredItems = foodItems
        .map((item) => ({
          ...item._doc,
          calculatedScore: calculateOverallScore(
            item.adminScore,
            item.communityScore
          ),
        }))
        .filter((item) => item.calculatedScore > 0)
        .sort((a, b) => b.calculatedScore - a.calculatedScore)
        .slice(0, 10);

      console.log(`Returning ${scoredItems.length} food items`);
      res.json(scoredItems);
    } else {
      res.status(400).json({ error: "Invalid category specified" });
    }
  } catch (error) {
    console.error("Error in filtered leaderboards:", error);
    res.status(500).json({ error: "Failed to fetch filtered leaderboards" });
  }
});

module.exports = router;
