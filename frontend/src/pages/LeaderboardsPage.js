// src/pages/LeaderboardsPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import CitySearch from "../components/CitySearch";
import "../styles/LeaderboardsPage.css"; // Import your CSS file for styling

// Configure the API base URL
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

function LeaderboardsPage() {
  // State management
  const [activeCategory, setActiveCategory] = useState("restaurants");
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("Burger");
  const [selectedCuisine, setCuisine] = useState("Italian");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [globalLeaderboards, setGlobalLeaderboards] = useState({});
  const [loading, setLoading] = useState(false);
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

  // Mock data for when backend is unavailable
  const getMockData = (type, category) => {
    const mockItems = [
      {
        _id: "1",
        name: "Sample Item 1",
        adminScore: 85,
        communityScore: 80,
        restaurantCount: 5,
      },
      {
        _id: "2",
        name: "Sample Item 2",
        adminScore: 78,
        communityScore: 82,
        restaurantCount: 3,
      },
      {
        _id: "3",
        name: "Sample Item 3",
        adminScore: 72,
        communityScore: 75,
        restaurantCount: 8,
      },
    ];

    if (type === "cities") {
      return [
        {
          _id: "1",
          name: "Calgary, Alberta",
          adminScore: 85,
          restaurantCount: 15,
        },
        {
          _id: "2",
          name: "Toronto, Ontario",
          adminScore: 82,
          restaurantCount: 23,
        },
        {
          _id: "3",
          name: "Vancouver, BC",
          adminScore: 78,
          restaurantCount: 18,
        },
      ];
    }

    return mockItems;
  };

  // Fetch global leaderboards when no city is selected
  const fetchGlobalLeaderboards = async () => {
    setLoading(true);
    try {
      const leaderboards = {};

      // Fetch top categories
      for (const cat of globalCategories) {
        try {
          let response;
          let url;

          if (cat.type === "cities") {
            // Get best cities by aggregating restaurant/food data
            url = `${API_BASE_URL}/api/restaurants/search`;
            response = await axios.get(url);
            if (response.data) {
              // Aggregate by city and calculate average scores
              const cityStats = {};
              response.data.forEach((restaurant) => {
                if (restaurant.address && restaurant.address.city) {
                  const city = restaurant.address.city;
                  if (!cityStats[city]) {
                    cityStats[city] = {
                      city: city,
                      province: restaurant.address.province,
                      country: restaurant.address.country,
                      restaurants: [],
                      totalScore: 0,
                      count: 0,
                    };
                  }

                  // Calculate restaurant score
                  const score =
                    restaurant.adminScore || restaurant.communityScore || 0;
                  if (score > 0) {
                    cityStats[city].restaurants.push(restaurant);
                    cityStats[city].totalScore += score;
                    cityStats[city].count++;
                  }
                }
              });

              // Convert to array and calculate averages
              const cityRankings = Object.values(cityStats)
                .filter((city) => city.count > 0)
                .map((city) => ({
                  name: `${city.city}, ${city.province}`,
                  city: city.city,
                  province: city.province,
                  country: city.country,
                  adminScore: Math.round(city.totalScore / city.count),
                  communityScore: 0,
                  restaurantCount: city.count,
                }))
                .sort((a, b) => b.adminScore - a.adminScore);

              response.data = cityRankings;
            }
          } else if (cat.type === "food-items" && cat.category) {
            // Use the type field for food items API
            url = `${API_BASE_URL}/api/food-items/rank/category/${cat.category}`;
            response = await axios.get(url);
          } else if (cat.type === "restaurants") {
            // Get top restaurants from all locations
            url = `${API_BASE_URL}/api/restaurants/search`;
            response = await axios.get(url);
          } else if (cat.type === "overall") {
            // Get all food items for overall best
            url = `${API_BASE_URL}/api/food-items/search`;
            response = await axios.get(url);
          } else if (cat.type === "cuisine") {
            // Get restaurants by cuisine type
            url = `${API_BASE_URL}/api/restaurants/search`;
            response = await axios.get(url);
            // Filter by cuisine on the frontend if needed
            if (response.data && cat.category) {
              response.data = response.data.filter(
                (item) =>
                  item.cuisine &&
                  item.cuisine.some((c) =>
                    c.toLowerCase().includes(cat.category.toLowerCase())
                  )
              );
            }
          }

          if (response && response.data) {
            leaderboards[cat.key] = response.data.slice(0, 10); // Top 10 for each
          } else {
            leaderboards[cat.key] = [];
          }
        } catch (error) {
          console.warn(
            `API unavailable for ${cat.title}, using mock data:`,
            error.message
          );
          // Use mock data when API is unavailable
          leaderboards[cat.key] = getMockData(cat.type, cat.category).slice(
            0,
            10
          );
        }
      }

      setGlobalLeaderboards(leaderboards);
    } catch (error) {
      console.error("Error fetching global leaderboards:", error);
      // Set empty arrays for all categories on major error
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

        setLeaderboardData(data.slice(0, 10)); // Top 10
      }
    } catch (error) {
      console.warn(
        "API unavailable for city data, using mock data:",
        error.message
      );
      // Use mock data when API is unavailable
      setLeaderboardData(getMockData(activeCategory).slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when selections change
  useEffect(() => {
    if (selectedCity) {
      fetchLeaderboardData();
    } else {
      fetchGlobalLeaderboards();
    }
  }, [activeCategory, selectedCity, selectedFoodCategory, selectedCuisine]);

  // Load global leaderboards on initial mount
  useEffect(() => {
    fetchGlobalLeaderboards();
  }, []);

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
    if (item.overallAverageScore) return Math.round(item.overallAverageScore);
    if (item.adminScore && item.communityScore) {
      return Math.round((item.adminScore + item.communityScore) / 2);
    }
    return item.adminScore || item.communityScore || 0;
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
                    {globalLeaderboards[category.key]?.length > 0 ? (
                      globalLeaderboards[category.key].map((item, index) => (
                        <div key={item._id || index} className="global-item">
                          <span className="global-rank">{index + 1}.</span>
                          <div className="global-item-info">
                            <span className="global-item-name">
                              {category.type === "cities"
                                ? item.name
                                : item.name ||
                                  item.foodItem?.name ||
                                  "Unknown Item"}
                            </span>
                            <span className="global-item-score">
                              {category.type === "cities"
                                ? `${getScore(item)}/10 (${
                                    item.restaurantCount
                                  } restaurants)`
                                : `${getScore(item)}/10`}
                            </span>
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
