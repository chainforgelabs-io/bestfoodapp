// src/pages/LeaderboardsPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CitySearch from "../components/CitySearch";
import "../styles/LeaderboardsPage.css"; // Import your CSS file for styling

// Configure the API base URL
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

function LeaderboardsPage() {
  const navigate = useNavigate();

  // State management
  const [activeCategory, setActiveCategory] = useState("restaurants");
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("Burger");
  const [selectedCuisine, setCuisine] = useState("Italian");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [globalLeaderboards, setGlobalLeaderboards] = useState({});
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Available categories with fixed icons
  const mainCategories = [
    { id: "restaurants", label: "Restaurants", icon: "fa-solid fa-utensils" },
    { id: "food-items", label: "Food Items", icon: "fa-solid fa-burger" },
    { id: "cuisines", label: "Cuisines", icon: "fa-solid fa-drumstick-bite" },
  ];

  // Updated food categories to match database types
  const foodCategories = [
    "Burger",
    "Pizza",
    "Tacos",
    "Burrito",
    "Hot Dog",
    "Fried Rice",
    "Fries",
    "Churro",
  ];

  const cuisineTypes = [
    "Italian",
    "Asian",
    "Mexican",
    "American",
    "Indian",
    "French",
    "Thai",
    "Chinese",
    "Japanese",
    "Mediterranean",
    "Vietnamese",
    "Fast Food",
  ];

  // Enhanced global leaderboard categories with new additions
  const globalCategories = [
    // Location categories
    {
      key: "bestCities",
      title: "🏙️ Best Cities",
      category: null,
      type: "cities",
    },

    // Restaurant categories
    {
      key: "bestRestaurants",
      title: "🏪 Best Restaurants",
      category: null,
      type: "restaurants",
    },
    {
      key: "bestOverallFood",
      title: "🌟 Best Overall Food",
      category: null,
      type: "overall",
    },

    // Food item categories
    {
      key: "bestBurgers",
      title: "🍔 Best Burgers",
      category: "Burger",
      type: "food-items",
    },
    {
      key: "bestPizza",
      title: "🍕 Best Pizza",
      category: "Pizza",
      type: "food-items",
    },
    {
      key: "bestTacos",
      title: "🌮 Best Tacos",
      category: "Tacos",
      type: "food-items",
    },
    {
      key: "bestBurritos",
      title: "🌯 Best Burritos",
      category: "Burrito",
      type: "food-items",
    },
    {
      key: "bestHotDogs",
      title: "🌭 Best Hot Dogs",
      category: "Hot Dog",
      type: "food-items",
    },
    {
      key: "bestFries",
      title: "🍟 Best Fries",
      category: "Fries",
      type: "food-items",
    },
    {
      key: "bestDesserts",
      title: "🍰 Best Desserts",
      category: "Churro",
      type: "food-items",
    },

    // Cuisine categories
    {
      key: "bestAmerican",
      title: "🇺🇸 Best American",
      category: "American",
      type: "cuisine",
    },
    {
      key: "bestItalian",
      title: "🇮🇹 Best Italian",
      category: "Italian",
      type: "cuisine",
    },
    {
      key: "bestVietnamese",
      title: "🇻🇳 Best Vietnamese",
      category: "Vietnamese",
      type: "cuisine",
    },
    {
      key: "bestMexican",
      title: "🇲🇽 Best Mexican",
      category: "Mexican",
      type: "cuisine",
    },
    {
      key: "bestFastFood",
      title: "⚡ Best Fast Food",
      category: "Fast Food",
      type: "cuisine",
    },
    {
      key: "bestAsian",
      title: "🥢 Best Asian",
      category: "Asian",
      type: "cuisine",
    },
  ];

  // OPTIMIZED: Fetch global leaderboards using new backend API (replaces the massive function)
  const fetchGlobalLeaderboards = async () => {
    setLoading(true);
    try {
      console.log("Fetching optimized global leaderboards...");
      const response = await axios.get(
        `${API_BASE_URL}/api/leaderboards/global`
      );
      setGlobalLeaderboards(response.data);
      console.log("Global leaderboards loaded successfully:", response.data);
    } catch (error) {
      console.error("Error fetching global leaderboards:", error);
      // Set empty arrays for all categories on error
      const emptyLeaderboards = {};
      globalCategories.forEach((cat) => {
        emptyLeaderboards[cat.key] = [];
      });
      setGlobalLeaderboards(emptyLeaderboards);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data based on current selections
  const fetchLeaderboardData = async () => {
    if (!selectedCity) return;

    setLoading(true);
    try {
      let endpoint = "";
      let params = {};

      switch (activeCategory) {
        case "restaurants":
          // Use the search endpoint that exists
          endpoint = `${API_BASE_URL}/api/restaurants/search`;
          params = {
            city: selectedCity.city,
            province: selectedCity.province,
            country: selectedCity.country,
          };
          break;

        case "food-items":
          // Use the correct food items endpoint with the type field
          endpoint = `${API_BASE_URL}/api/food-items/rank/category/${selectedFoodCategory}/city/${selectedCity.city}`;
          break;

        case "cuisines":
          // Use restaurant search for cuisines
          endpoint = `${API_BASE_URL}/api/restaurants/search`;
          params = {
            city: selectedCity.city,
            province: selectedCity.province,
            country: selectedCity.country,
          };
          break;
      }

      if (endpoint) {
        const response = await axios.get(endpoint, { params });
        let data = response.data;

        // Filter by cuisine if searching restaurants or cuisines
        if (
          (activeCategory === "restaurants" || activeCategory === "cuisines") &&
          selectedCuisine
        ) {
          data = data.filter(
            (item) =>
              item.cuisine &&
              item.cuisine.some((c) =>
                c.toLowerCase().includes(selectedCuisine.toLowerCase())
              )
          );
        }

        // Calculate real scores for restaurants if this is a restaurant category
        if (activeCategory === "restaurants" || activeCategory === "cuisines") {
          if (data && data.length > 0) {
            const restaurantsWithScores = await Promise.all(
              data.map(async (restaurant) => {
                try {
                  // Get all food items for this restaurant
                  const foodItemsResponse = await axios.get(
                    `${API_BASE_URL}/api/food-items/restaurant/${restaurant._id}`
                  );

                  if (
                    foodItemsResponse.data &&
                    foodItemsResponse.data.length > 0
                  ) {
                    const foodItems = foodItemsResponse.data;
                    let totalScore = 0;
                    let validScores = 0;

                    // Calculate average of all food item scores
                    foodItems.forEach((item) => {
                      // Use the backend's calculated overallAverageScore first
                      const itemScore = item.overallAverageScore || 0;

                      if (itemScore > 0) {
                        totalScore += itemScore;
                        validScores++;
                      }
                    });

                    if (validScores > 0) {
                      const avgScore = totalScore / validScores;
                      return {
                        ...restaurant,
                        adminScore: Math.round(avgScore),
                        communityScore: 0,
                        overallScore: Math.round(avgScore),
                        hasValidScore: true,
                      };
                    }
                  }

                  // No valid scores found
                  return {
                    ...restaurant,
                    adminScore: null,
                    communityScore: null,
                    overallScore: null,
                    hasValidScore: false,
                  };
                } catch (error) {
                  console.warn(
                    `Failed to fetch food items for restaurant ${restaurant._id}:`,
                    error
                  );
                  return {
                    ...restaurant,
                    adminScore: null,
                    communityScore: null,
                    overallScore: null,
                    hasValidScore: false,
                  };
                }
              })
            );

            // Sort by overall score (highest first), but handle null scores
            data = restaurantsWithScores.sort((a, b) => {
              if (!a.hasValidScore && !b.hasValidScore) return 0;
              if (!a.hasValidScore) return 1;
              if (!b.hasValidScore) return -1;
              return (b.overallScore || 0) - (a.overallScore || 0);
            });
          }
        }

        setLeaderboardData(data.slice(0, 10)); // Top 10
      }
    } catch (error) {
      console.warn(
        "API unavailable for city data, using mock data:",
        error.message
      );
      // Use mock data when API is unavailable
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  // OPTIMIZED: Effect to fetch data when selections change - removed duplicate call
  useEffect(() => {
    if (selectedCity) {
      fetchLeaderboardData();
    } else {
      // Only fetch global leaderboards if we don't have them yet
      if (Object.keys(globalLeaderboards).length === 0) {
        fetchGlobalLeaderboards();
      }
    }
  }, [activeCategory, selectedCity, selectedFoodCategory, selectedCuisine]);

  // Handle city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
  };

  // Reset city like home page
  const handleResetCity = () => {
    setSelectedCity(null);
    setSearchTerm("");
    setLeaderboardData([]);
  };

  // Filter data based on search term
  const filteredData = leaderboardData.filter((item) => {
    const name = item.name || item.foodItem?.name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get title based on active category
  const getTitle = () => {
    if (!selectedCity) return "Global Food Leaderboards";

    switch (activeCategory) {
      case "restaurants":
        return `Best ${selectedCuisine} Restaurants in ${selectedCity.city}`;
      case "food-items":
        return `Best ${selectedFoodCategory} in ${selectedCity.city}`;
      case "cuisines":
        return `Top ${selectedCuisine} Spots in ${selectedCity.city}`;
      default:
        return `Leaderboards for ${selectedCity.city}`;
    }
  };

  // Get score for display
  const getScore = (item) => {
    // Handle different data structures

    // For food items from ranking API (has foodItem property)
    if (item.foodItem) {
      const score =
        item.averageScore ||
        item.foodItem.averageScore ||
        item.foodItem.adminScore ||
        item.foodItem.communityScore ||
        0;
      return score > 0 ? Math.round(score) : "N/A";
    }

    // For restaurants with calculated overall score
    if (item.overallScore !== undefined) {
      return item.overallScore !== null ? Math.round(item.overallScore) : "N/A";
    }

    // For direct food items or restaurants
    if (item.overallAverageScore) return Math.round(item.overallAverageScore);
    if (item.adminScore && item.communityScore) {
      return Math.round((item.adminScore + item.communityScore) / 2);
    }

    const score = item.adminScore || item.communityScore || 0;
    return score > 0 ? Math.round(score) : "N/A";
  };

  // Get ranking medal/trophy
  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return "🏆";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  // Navigation handlers
  const handleRestaurantClick = (restaurantId) => {
    if (restaurantId) {
      navigate(`/restaurant/${restaurantId}`);
    }
  };

  const handleCityClick = (city) => {
    if (city && city.city && city.province && city.country) {
      // Navigate to home page with city selected
      navigate("/", {
        state: {
          selectedCity: {
            city: city.city,
            province: city.province,
            country: city.country,
          },
        },
      });
    }
  };

  const handleFoodItemClick = (item) => {
    // For food items, navigate to their restaurant
    let restaurantId = null;

    if (item.foodItem?.restaurant?._id) {
      restaurantId = item.foodItem.restaurant._id;
    } else if (item.foodItem?.restaurant) {
      restaurantId = item.foodItem.restaurant;
    } else if (item.restaurant?._id) {
      restaurantId = item.restaurant._id;
    } else if (item.restaurant) {
      restaurantId = item.restaurant;
    }

    if (restaurantId) {
      navigate(`/restaurant/${restaurantId}`);
    }
  };

  return (
    <div className="leaderboards-page">
      <div className="leaderboards-header">
        <h1 className="page-title">🏆 Food Leaderboards</h1>
        <p className="page-subtitle">Discover the best food in your city</p>
      </div>

      {/* City Search Section */}
      <div className="search-section">
        <div className="city-search-container">
          <label className="search-label">Choose Your City</label>
          <CitySearch onSelectCity={handleCitySelect} />
          {selectedCity && (
            <button onClick={handleResetCity} className="reset-city-button">
              <i className="fa fa-times"></i>
              <span>Reset City</span>
            </button>
          )}
        </div>

        {selectedCity && (
          <div className="current-city">
            <span className="city-badge">
              📍 {selectedCity.city}, {selectedCity.province}
            </span>
          </div>
        )}
      </div>

      {/* Category Selection - show all the time, but keep selections when city changes */}
      <div className="category-section">
        <h3 className="section-title">Choose Category</h3>
        <div className="category-tabs">
          {mainCategories.map((category) => (
            <button
              key={category.id}
              className={`category-tab ${
                activeCategory === category.id ? "active" : ""
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className="category-icon">
                <i className={category.icon}></i>
              </span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-category Selection - show all the time, but keep selections when city changes */}
      <div className="filter-section">
        {activeCategory === "food-items" && (
          <div className="filter-group">
            <label className="filter-label">Food Category</label>
            <select
              value={selectedFoodCategory}
              onChange={(e) => setSelectedFoodCategory(e.target.value)}
              className="filter-select"
            >
              {foodCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {(activeCategory === "restaurants" ||
          activeCategory === "cuisines") && (
          <div className="filter-group">
            <label className="filter-label">Cuisine Type</label>
            <select
              value={selectedCuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="filter-select"
            >
              {cuisineTypes.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search within results */}
        {selectedCity && (
          <div className="filter-group">
            <label className="filter-label">Search Results</label>
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Filter results..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-search-input"
              />
              <i className="fa fa-search search-icon"></i>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="results-section">
        <h2 className="results-title">{getTitle()}</h2>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : selectedCity ? (
          // City-specific results
          filteredData.length > 0 ? (
            <div className="leaderboard-grid">
              {filteredData.map((item, index) => (
                <div
                  key={item._id || item.foodItem?._id || index}
                  className={`leaderboard-card ${index < 3 ? "top-three" : ""}`}
                  onClick={() => {
                    if (activeCategory === "restaurants") {
                      handleRestaurantClick(item._id);
                    } else if (activeCategory === "food-items") {
                      handleFoodItemClick(item);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="rank-badge">
                    <span className="rank-icon">{getRankIcon(index)}</span>
                  </div>

                  <div className="card-content">
                    <h3 className="item-name">
                      {item.name || item.foodItem?.name || "Unknown Item"}
                    </h3>

                    {activeCategory === "food-items" && (
                      <p className="restaurant-name">
                        at{" "}
                        {item.foodItem?.restaurant?.name ||
                          item.restaurant?.name}
                      </p>
                    )}

                    {item.cuisine && (
                      <div className="cuisine-tags">
                        {Array.isArray(item.cuisine) ? (
                          item.cuisine.map((c) => (
                            <span key={c} className="cuisine-tag">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="cuisine-tag">{item.cuisine}</span>
                        )}
                      </div>
                    )}

                    <div className="score-container">
                      <div className="score-circle">
                        <span className="score-number">{getScore(item)}</span>
                        <span className="score-label">Score</span>
                      </div>

                      {item.price && (
                        <div className="price-info">
                          <span className="price-label">Price:</span>
                          <span className="price-value">${item.price}</span>
                        </div>
                      )}
                    </div>

                    {item.address && (
                      <p className="address-info">
                        📍 {item.address.street}, {item.address.city}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No results found</h3>
              <p>Try adjusting your filters or search in a different city</p>
            </div>
          )
        ) : (
          // Global leaderboards when no city selected
          <div className="global-leaderboards">
            <div className="global-intro">
              <div className="prompt-icon">🌟</div>
              <h3>Ready to explore?</h3>
              <p>
                Check out our global top food rankings, or select a city above
                for local leaderboards!
              </p>
            </div>

            <div className="global-grid">
              {globalCategories.map((category) => (
                <div key={category.key} className="global-category-card">
                  <h4 className="global-category-title">{category.title}</h4>
                  <div className="global-items-list">
                    {categoryLoading[category.key] ? (
                      <div className="category-loading">
                        <div className="mini-spinner"></div>
                        <p>Loading...</p>
                      </div>
                    ) : globalLeaderboards[category.key]?.length > 0 ? (
                      globalLeaderboards[category.key].map((item, index) => (
                        <div
                          key={`${category.key}-${item._id || index}`}
                          className="global-item"
                          onClick={() => {
                            if (category.type === "cities") {
                              handleCityClick(item);
                            } else if (category.type === "food-items") {
                              handleFoodItemClick(item);
                            } else if (
                              category.type === "restaurants" ||
                              category.type === "cuisine"
                            ) {
                              handleRestaurantClick(item._id);
                            } else if (category.type === "overall") {
                              // For overall food items, navigate to restaurant
                              const restaurantId =
                                item.restaurant?._id || item.restaurant;
                              if (restaurantId) {
                                handleRestaurantClick(restaurantId);
                              }
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <span className="global-rank">{index + 1}.</span>
                          <div className="global-item-info">
                            <span className="global-item-name">
                              {category.type === "cities"
                                ? item.name
                                : item.name ||
                                  item.foodItem?.name ||
                                  "Unknown Item"}
                            </span>
                            <div className="global-item-details">
                              <span className="global-item-score">
                                {category.type === "cities"
                                  ? getScore(item) === "N/A"
                                    ? `N/A (${item.restaurantCount} restaurants)`
                                    : `${getScore(item)}/100 (${
                                        item.restaurantCount
                                      } restaurants)`
                                  : getScore(item) === "N/A"
                                  ? "N/A"
                                  : `${getScore(item)}/100`}
                              </span>

                              {/* Show additional details for food items */}
                              {category.type === "food-items" && (
                                <div className="global-extra-info">
                                  {(item.foodItem?.restaurant?.name ||
                                    item.restaurant?.name) && (
                                    <span className="global-restaurant">
                                      🏪{" "}
                                      {item.foodItem?.restaurant?.name ||
                                        item.restaurant?.name}
                                    </span>
                                  )}
                                  {(item.foodItem?.restaurant?.address ||
                                    item.restaurant?.address) && (
                                    <span className="global-address">
                                      📍{" "}
                                      {item.foodItem?.restaurant?.address
                                        ?.street ||
                                      item.restaurant?.address?.street
                                        ? `${
                                            item.foodItem?.restaurant?.address
                                              ?.street ||
                                            item.restaurant?.address?.street
                                          }, `
                                        : ""}
                                      {item.foodItem?.restaurant?.address
                                        ?.city ||
                                        item.restaurant?.address?.city}
                                    </span>
                                  )}
                                  {(item.foodItem?.price || item.price) && (
                                    <span className="global-price">
                                      💰 ${item.foodItem?.price || item.price}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Show additional details for overall food items */}
                              {category.type === "overall" && (
                                <div className="global-extra-info">
                                  {item.restaurant?.name && (
                                    <span className="global-restaurant">
                                      🏪 {item.restaurant.name}
                                    </span>
                                  )}
                                  {item.restaurant?.address && (
                                    <span className="global-address">
                                      📍{" "}
                                      {item.restaurant.address.street
                                        ? `${item.restaurant.address.street}, `
                                        : ""}
                                      {item.restaurant.address.city}
                                    </span>
                                  )}
                                  {item.price && (
                                    <span className="global-price">
                                      💰 ${item.price}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Show address for restaurants and cuisine categories */}
                              {(category.type === "restaurants" ||
                                category.type === "cuisine") &&
                                item.address && (
                                  <div className="global-extra-info">
                                    <span className="global-address">
                                      📍{" "}
                                      {item.address.street
                                        ? `${item.address.street}, `
                                        : ""}
                                      {item.address.city}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-global-items">No items yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Section - only for city results */}
      {selectedCity && leaderboardData.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-title">Quick Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{leaderboardData.length}</div>
              <div className="stat-label">Total Items</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {Math.round(getScore(leaderboardData[0]) || 0)}
              </div>
              <div className="stat-label">Top Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {Math.round(
                  leaderboardData.reduce(
                    (sum, item) => sum + getScore(item),
                    0
                  ) / leaderboardData.length
                ) || 0}
              </div>
              <div className="stat-label">Avg Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaderboardsPage;
