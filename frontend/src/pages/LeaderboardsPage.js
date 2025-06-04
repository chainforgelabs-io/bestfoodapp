// src/pages/LeaderboardsPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import CitySearch from "../components/CitySearch";
import "../styles/LeaderboardsPage.css"; // Import your CSS file for styling

function LeaderboardsPage() {
  // State management
  const [activeCategory, setActiveCategory] = useState("restaurants");
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("Burgers");
  const [selectedCuisine, setCuisine] = useState("Italian");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Available categories
  const mainCategories = [
    { id: "restaurants", label: "Restaurants", icon: "fa-solid fa-utensils" },
    { id: "food-items", label: "Food Items", icon: "fa-solid fa-burger" },
    { id: "cuisines", label: "Cuisines", icon: "fa-solid fa-bowl-food" },
  ];

  const foodCategories = [
    "Burgers",
    "Mains",
    "Pizza",
    "Appetizers",
    "Desserts",
    "Sandwiches/Handhelds",
    "Deep-Fried",
    "Sides",
    "Drinks",
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
  ];

  const restaurantTypes = [
    "Fast Food",
    "Fine Dining",
    "Casual Dining",
    "Fast Casual",
    "Cafe",
    "Bakery",
    "Food Truck",
  ];

  // Fetch data based on current selections
  const fetchLeaderboardData = async () => {
    if (!selectedCity && activeCategory !== "global") return;

    setLoading(true);
    try {
      let endpoint = "";
      let params = {};

      switch (activeCategory) {
        case "restaurants":
          if (selectedCity) {
            endpoint = `/api/restaurants/rank/type-or-cuisine/city/${selectedCity.city}`;
            params = { search: selectedCuisine };
          }
          break;

        case "food-items":
          if (selectedCity) {
            endpoint = `/api/food-items/rank/category/${selectedFoodCategory}/city/${selectedCity.city}`;
          } else {
            endpoint = `/api/food-items/rank/category/${selectedFoodCategory}`;
          }
          break;

        case "cuisines":
          // This would be a custom aggregation - for now we'll use restaurants
          if (selectedCity) {
            endpoint = `/api/restaurants/rank/type-or-cuisine/city/${selectedCity.city}`;
            params = { search: selectedCuisine };
          }
          break;
      }

      if (endpoint) {
        const response = await axios.get(endpoint, { params });
        setLeaderboardData(response.data.slice(0, 10)); // Top 10
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when selections change
  useEffect(() => {
    fetchLeaderboardData();
  }, [activeCategory, selectedCity, selectedFoodCategory, selectedCuisine]);

  // Handle city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
  };

  // Filter data based on search term
  const filteredData = leaderboardData.filter((item) => {
    const name = item.name || item.foodItem?.name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get title based on active category
  const getTitle = () => {
    if (!selectedCity) return "Select a city to view leaderboards";

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
        </div>

        {selectedCity && (
          <div className="current-city">
            <span className="city-badge">
              📍 {selectedCity.city}, {selectedCity.province}
            </span>
          </div>
        )}
      </div>

      {/* Category Selection */}
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

      {/* Sub-category Selection */}
      {selectedCity && (
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
        </div>
      )}

      {/* Results Section */}
      <div className="results-section">
        <h2 className="results-title">{getTitle()}</h2>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : selectedCity ? (
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
          <div className="select-city-prompt">
            <h3>Ready to explore?</h3>
            <p>Select a city above to discover the best food leaderboards!</p>
          </div>
        )}
      </div>

      {/* Quick Stats Section */}
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
