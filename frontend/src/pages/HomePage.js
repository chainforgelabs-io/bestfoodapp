import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";
import Logo from "../assets/logo.png"; // Import your logo here

function HomePage() {
  const [searchTerm, setSearchTerm] = useState(""); // City search term
  const [citySelected, setCitySelected] = useState(""); // Selected city
  const [results, setResults] = useState([]); // Restaurant search results
  const [foodItems, setFoodItems] = useState([]); // Food search results
  const [activeFilter, setActiveFilter] = useState("Restaurants"); // Active filter ("Restaurants" by default)
  const [showReviewForm, setShowReviewForm] = useState(false); // Review form visibility
  const [reviewText, setReviewText] = useState(""); // Review text
  const [reviewScore, setReviewScore] = useState(""); // Review score
  const [hasSearched, setHasSearched] = useState(false); // Whether search was performed
  const [foodSearchTerm, setFoodSearchTerm] = useState(""); // Food item search term
  const [restaurantScores, setRestaurantScores] = useState({}); // Holds the restaurant scores
  const navigate = useNavigate(); // For navigation

  // Search for restaurants by city
  const handleCitySearch = async (e) => {
    e.preventDefault();
    setHasSearched(true); // Mark search as performed

    const formattedCity = capitalizeWords(searchTerm); // Capitalize city name

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/search`,
        { params: { city: formattedCity } }
      );
      setResults(response.data);
      setCitySelected(formattedCity); // Set the selected city
      setSearchTerm(""); // Clear search input
      setActiveFilter("Restaurants"); // Default to restaurants after city search
    } catch (error) {
      console.error("Error searching restaurants by city:", error);
      alert("No restaurants found in this city");
      setResults([]);
    }
  };

  // Search for food items in the selected city
  const handleFoodSearch = async () => {
    if (!citySelected) {
      alert("Please select a city first.");
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/food-items/rank/city/${citySelected}`
      );

      setFoodItems(
        response.data.sort((a, b) => {
          return b.overallAverageScore - a.overallAverageScore;
        })
      ); // Sort food items by rank (best to worst)
    } catch (error) {
      console.error("Error searching food items:", error);
      alert("No food items found in this city for the selected category.");
      setFoodItems([]);
    }
  };

  // Search for restaurants or food based on the selected filter and search term
  const handleSearch = async (e) => {
    e.preventDefault();

    if (activeFilter === "Restaurants") {
      // Search restaurants based on type or cuisine
      const filteredRestaurants = results.filter(
        (restaurant) =>
          (restaurant.type &&
            restaurant.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (restaurant.cuisine &&
            restaurant.cuisine.some((cuisine) =>
              cuisine.toLowerCase().includes(searchTerm.toLowerCase())
            ))
      );
      setResults(filteredRestaurants);
    } else if (activeFilter === "Food") {
      // Search food items based on category, type, or subType
      if (!foodSearchTerm) {
        alert("Please enter a food item to search.");
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/food-items/rank/category/${foodSearchTerm}/city/${citySelected}`
        );

        setFoodItems(
          response.data.sort((a, b) => {
            return b.overallAverageScore - a.overallAverageScore;
          })
        ); // Sort food items by rank (best to worst)
      } catch (error) {
        console.error("Error searching food items:", error);
        alert("No food items found in this city for the selected category.");
        setFoodItems([]);
      }
    }
  };

  // Function to fetch restaurant scores and store them in state
  const fetchRestaurantScores = async (restaurantId) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/food-items/restaurant/${restaurantId}/scores`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching restaurant scores:", error);
      return {
        adminAverageScore: 0,
        communityAverageScore: 0,
        overallAverageScore: 0,
      };
    }
  };

  // Fetch scores after loading restaurants
  useEffect(() => {
    const loadRestaurantScores = async () => {
      const scores = {};
      for (const restaurant of results) {
        const score = await fetchRestaurantScores(restaurant._id);
        scores[restaurant._id] = score;
      }
      setRestaurantScores(scores);
    };

    if (results.length > 0) {
      loadRestaurantScores();
    }
  }, [results]);

  // Helper function to capitalize the first letter of each word
  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Reset city search
  const handleResetCity = () => {
    setSearchTerm("");
    setResults([]);
    setCitySelected("");
    setHasSearched(false);
    setFoodItems([]); // Clear food items when resetting
  };

  // Handle review creation
  const handleCreateReviewClick = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to perform this action.");
      navigate("/login");
    } else {
      setShowReviewForm(true); // Show review form if authenticated
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);

    if (filter === "Restaurants") {
      // Fetch and display restaurant data (already fetched in `results`)
      setFoodItems([]); // Clear food list when "Restaurants" is selected
    } else if (filter === "Food") {
      // Fetch food items based on the selected city
      handleFoodSearch();
    }
  };

  // Handle review submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const reviewData = {
        restaurantId: "5f9f1b9b9b9b9b9b9b9b9b9", // Placeholder restaurant ID
        comment: reviewText,
        score: reviewScore,
      };
      await axios.post("/api/reviews", reviewData);
      alert("Review submitted successfully!");
      setReviewText("");
      setReviewScore("");
      setShowReviewForm(false);
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  return (
    <div className="home-container">
      {!hasSearched ? (
        <>
          {/* Initial layout (before search) */}
          <div className="logo-container">
            <img src={Logo} alt="Best Food App Logo" className="app-logo" />
          </div>
          <h1 className="home-title">Find the best food in your city!</h1>
          <form onSubmit={handleCitySearch} className="search-form">
            <input
              type="text"
              placeholder="Search for cities"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <i className="fa fa-search"></i>
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Layout after city search */}
          <div className="logo-container">
            <img src={Logo} alt="Best Food App Logo" className="app-logo" />
          </div>
          <h1 className="home-title">Find the best food in {citySelected}</h1>

          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder={`Search for ${
                activeFilter === "Food" ? "food" : "restaurants"
              } in ${citySelected}`}
              value={foodSearchTerm}
              onChange={(e) => setFoodSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <i className="fa fa-search"></i>
            </button>
          </form>

          <div className="filter-section">
            <button
              className={`filter-button ${
                activeFilter === "Food" ? "active" : ""
              }`}
              onClick={() => handleFilterChange("Food")}
            >
              Food
            </button>
            <button
              className={`filter-button ${
                activeFilter === "Restaurants" ? "active" : ""
              }`}
              onClick={() => handleFilterChange("Restaurants")}
            >
              Restaurants
            </button>
          </div>

          {/* Display content based on the selected filter */}
          {activeFilter === "Restaurants" && (
            <div className="results-section">
              {results.length > 0 ? (
                results
                  .sort((a, b) => {
                    const aScore =
                      restaurantScores[a._id]?.overallAverageScore || 0;
                    const bScore =
                      restaurantScores[b._id]?.overallAverageScore || 0;
                    return bScore - aScore; // Sort descending by overall score
                  })
                  .map((result, index) => (
                    <div key={result._id} className="result-item">
                      <h3>
                        {index + 1}. {result.name}
                      </h3>
                      <div>
                        <p>{result.cuisine.join(", ")}</p>
                        <p>
                          {result.address.street}, {result.address.city},{" "}
                          {result.address.province}, {result.address.country}
                        </p>
                        <p>
                          Admin Score:{" "}
                          {Math.round(
                            restaurantScores[result._id]?.adminAverageScore || 0
                          )}
                          , Community Score:{" "}
                          {Math.round(
                            restaurantScores[result._id]
                              ?.communityAverageScore || 0
                          )}
                          , Overall Score:{" "}
                          {Math.round(
                            restaurantScores[result._id]?.overallAverageScore ||
                              0
                          )}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <p>No restaurants found in this city.</p>
              )}
            </div>
          )}

          {activeFilter === "Food" && (
            <div className="results-section">
              {foodItems.length > 0 ? (
                foodItems.map((item, index) => (
                  <div
                    key={item?.foodItem?._id || index}
                    className="result-item"
                  >
                    <h3>
                      {index + 1}. {item?.foodItem?.name || "Unnamed Food Item"}
                    </h3>
                    <p>
                      {item?.foodItem?.restaurant?.name || "Unknown Restaurant"}{" "}
                      (
                      {item?.foodItem?.restaurant?.address?.street ||
                        "No street info"}
                      ,
                      {item?.foodItem?.restaurant?.address?.city ||
                        "No city info"}
                      ,
                      {item?.foodItem?.restaurant?.address?.province ||
                        "No province info"}
                      ,
                      {item?.foodItem?.restaurant?.address?.country ||
                        "No country info"}
                      )
                    </p>
                    <p>
                      Admin Score: {Math.round(item.adminScore || 0)}, Community
                      Score: {Math.round(item.communityScore || 0)}, Overall
                      Score: {Math.round(item.overallAverageScore || 0)}
                    </p>
                  </div>
                ))
              ) : (
                <p>
                  No food items found in this city for the selected category.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Reset city */}
      <button onClick={handleResetCity} className="reset-button">
        Reset City
      </button>

      {/* Create a review button */}
      <button className="make-review-btn" onClick={handleCreateReviewClick}>
        Make a review
      </button>

      {/* Review form */}
      {showReviewForm && (
        <div className="review-form-container">
          <h3>Submit a Review</h3>
          <form onSubmit={handleReviewSubmit} className="review-form">
            <textarea
              placeholder="Write your review..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Score (1-100)"
              value={reviewScore}
              onChange={(e) => setReviewScore(e.target.value)}
              required
              min="1"
              max="100"
            />
            <button type="submit">Submit Review</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default HomePage;
