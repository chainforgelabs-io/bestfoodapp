import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import CitySearch from "../components/CitySearch"; // Adjust the path if necessary
import { useCityFromUrl } from "../hooks/useCityFromUrl";
import { generateSeoMeta } from "../utils/cityUtils";
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
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState(""); // Restaurant search term
  const [restaurantScores, setRestaurantScores] = useState({}); // Holds the restaurant scores
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate(); // For navigation

  // Use custom hook for URL-based city detection
  const { cityFromUrl, hasUrlCity, updateUrlWithCity } =
    useCityFromUrl("/city");

  // Initialize city from URL if present
  useEffect(() => {
    if (hasUrlCity && cityFromUrl && !citySelected) {
      setCitySelected(cityFromUrl);
      setHasSearched(true);
      // Trigger initial search
      performCitySearch(cityFromUrl);
    }
  }, [hasUrlCity, cityFromUrl]);

  // Update URL when city is selected manually
  const handleCitySelect = (selectedCity) => {
    setCitySelected(selectedCity);
    updateUrlWithCity(
      selectedCity.city,
      selectedCity.province,
      selectedCity.country
    );
  };

  // Extracted city search logic
  const performCitySearch = async (cityData) => {
    if (
      !cityData ||
      !cityData.city ||
      !cityData.province ||
      !cityData.country
    ) {
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/search`,
        {
          params: {
            city: cityData.city,
            province: cityData.province,
            country: cityData.country,
          },
        }
      );
      console.log(response.data);
      setResults(response.data);
      setHasSearched(true);
      setActiveFilter("Restaurants");
    } catch (error) {
      console.error("Error searching restaurants by city:", error);
      setResults([]);
      setHasSearched(true);
      setActiveFilter("Restaurants");
    }
  };

  // Generate SEO meta tags
  const seoMeta =
    citySelected && citySelected.city
      ? generateSeoMeta(
          citySelected.city,
          citySelected.province,
          citySelected.country,
          "home"
        )
      : {
          title: "Find the Best Food in Your City | Food Rankings & Reviews",
          description:
            "Discover top-rated restaurants and food in cities across Canada and the US. Read reviews, see rankings, and find amazing dining experiences.",
          keywords:
            "best food, restaurant reviews, food rankings, dining guide",
        };

  // Search for restaurants by city, province, and country
  const handleCitySearch = async (e) => {
    e.preventDefault();
    await performCitySearch(citySelected);
  };

  // Search for food items in the selected city
  const handleFoodSearch = async () => {
    if (
      !citySelected ||
      !citySelected.city ||
      !citySelected.province ||
      !citySelected.country
    ) {
      // Return silently - the UI will show the proper state
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/food-items/rank/city/${citySelected.city}`,
        {
          params: {
            province: citySelected.province,
            country: citySelected.country,
          },
        }
      );

      setFoodItems(
        response.data.sort(
          (a, b) => b.overallAverageScore - a.overallAverageScore
        )
      );
    } catch (error) {
      console.error("Error searching food items:", error);
      setFoodItems([]);
    }
  };

  // Search for restaurants or food based on the selected filter and search term
  const handleSearch = async (e) => {
    e.preventDefault();

    if (
      !citySelected ||
      !citySelected.city ||
      !citySelected.province ||
      !citySelected.country
    ) {
      alert("Please select a city, province, and country.");
      return;
    }

    if (activeFilter === "Restaurants") {
      if (!restaurantSearchTerm) {
        // Return silently - user can search without a term to see all restaurants
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/search`,
            {
              params: {
                city: citySelected.city,
                province: citySelected.province,
                country: citySelected.country,
              },
            }
          );
          setResults(response.data);
          return;
        } catch (error) {
          console.error("Error searching restaurants:", error);
          setResults([]);
          return;
        }
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/rank/type-or-cuisine/city/${citySelected.city}`,
          {
            params: {
              search: restaurantSearchTerm, // Send single search term for either type or cuisine
            },
          }
        );

        // Log the response for debugging
        console.log("API Response:", response.data);

        // Filter and sort the results based on overall score
        const sortedResults = response.data.sort((a, b) => {
          return b.overallAverageScore - a.overallAverageScore;
        });

        setResults(sortedResults); // Update state with sorted results
        console.log("Filtered Results:", sortedResults);
      } catch (error) {
        console.warn(
          "Restaurant search endpoint not available, trying basic search:",
          error.message
        );
        // Fallback to basic restaurant search if the ranking endpoint fails
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/search`,
            {
              params: {
                city: citySelected.city,
                province: citySelected.province,
                country: citySelected.country,
              },
            }
          );
          // Filter restaurants by the search term locally
          const filteredResults = restaurantSearchTerm
            ? response.data.filter(
                (restaurant) =>
                  restaurant.name
                    .toLowerCase()
                    .includes(restaurantSearchTerm.toLowerCase()) ||
                  restaurant.type
                    ?.toLowerCase()
                    .includes(restaurantSearchTerm.toLowerCase()) ||
                  restaurant.cuisine?.some((c) =>
                    c.toLowerCase().includes(restaurantSearchTerm.toLowerCase())
                  )
              )
            : response.data;
          setResults(filteredResults);
        } catch (fallbackError) {
          console.error(
            "Both restaurant search methods failed:",
            fallbackError
          );
          setResults([]); // Clear results on error
        }
      }
    } else if (activeFilter === "Food") {
      if (!foodSearchTerm) {
        // Allow search without specific term - will show all food in the city
        handleFoodSearch();
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/food-items/rank/category/${foodSearchTerm}/city/${citySelected.city}`,
          {
            params: {
              province: citySelected.province,
              country: citySelected.country,
            },
          }
        );

        setFoodItems(
          response.data.sort((a, b) => {
            return b.overallAverageScore - a.overallAverageScore;
          })
        );
      } catch (error) {
        console.error("Error searching food items:", error);
        setFoodItems([]);
      }
    }
  };

  // function that handles fetching suggestions
  // const fetchSuggestions = async (query) => {
  //   try {
  //     const response = await axios.get(
  //       `${process.env.REACT_APP_API_BASE_URL}/api/suggestions`,
  //       { params: { searchTerm: query, city: citySelected } }
  //     );
  //     // console.log("Suggestions fetched:", response.data);
  //     setSuggestions(response.data);
  //   } catch (error) {
  //     console.error("Error fetching suggestions:", error);
  //   }
  // };

  // Function to fetch restaurant scores and store them in state
  const fetchRestaurantScores = async (restaurantId) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/food-items/restaurant/${restaurantId}/scores`
      );
      return response.data;
    } catch (error) {
      // Handle 404 and other errors gracefully - don't log them as errors since some restaurants may not have scores yet
      if (error.response?.status === 404) {
        // Restaurant doesn't have any food items or scores yet
        return {
          adminAverageScore: 0,
          communityAverageScore: 0,
          overallAverageScore: 0,
        };
      }
      // For other errors, still return default scores but log the error
      console.warn(
        "Error fetching restaurant scores for restaurant",
        restaurantId,
        ":",
        error.message
      );
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
      navigate("/login"); // Redirect to login if not authenticated
    } else {
      navigate("/submit-review"); // Navigate to the Review Submission page
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

  // Handle form submission when Enter is pressed
  const handleEnterPress = () => {
    if (
      citySelected &&
      citySelected.city &&
      citySelected.province &&
      citySelected.country
    ) {
      handleCitySearch({ preventDefault: () => {} }); // Call the city search function
    } else {
      console.error("Incomplete city, province, or country information.");
    }
  };

  return (
    <div className="home-container">
      <Helmet>
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
      </Helmet>
      {!hasSearched ? (
        <>
          {/* Initial layout (before search) */}
          <div className="logo-container">
            <img src={Logo} alt="Best Food App Logo" className="app-logo" />
          </div>
          <h1 className="home-title">Find the best food in your city!</h1>
          <form onSubmit={handleCitySearch} className="search-form">
            {/* Pass down the onSelectCity method */}
            <CitySearch
              onSelectCity={handleCitySelect}
              onEnterPress={handleEnterPress}
            />
            <button type="submit" className="search-button">
              <i className="fa fa-search"></i>
              <span style={{ marginLeft: "8px" }}>Search</span>
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Layout after city search */}
          <div className="logo-container">
            <img src={Logo} alt="Best Food App Logo" className="app-logo" />
          </div>
          <h1 className="home-title">
            Find the best food in {citySelected.city}, {citySelected.province},{" "}
            {citySelected.country}
          </h1>

          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder={`Search for ${
                activeFilter === "Food" ? "food" : "restaurants"
              } in ${citySelected.city}`}
              value={
                activeFilter === "Food" ? foodSearchTerm : restaurantSearchTerm
              }
              onChange={(e) => {
                if (activeFilter === "Food") {
                  setFoodSearchTerm(e.target.value);
                } else {
                  setRestaurantSearchTerm(e.target.value);
                }
                // fetchSuggestions(e.target.value); // Fetch suggestions for both cases
              }}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <i className="fa fa-search"></i>
              <span style={{ marginLeft: "8px" }}>Search</span>
            </button>
          </form>

          {/*dropdown under the search input that displays the suggestions*/}
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => {
                    setFoodSearchTerm(suggestion);
                    setSuggestions([]); // Clear suggestions once selected
                  }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}

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
                    <div
                      key={result._id}
                      className="result-item"
                      onClick={() => navigate(`/restaurant/${result._id}`)}
                    >
                      <div className="result-header">
                        <div className="rank-number">#{index + 1}</div>
                        <h3 className="restaurant-name">{result.name}</h3>
                        <div className="overall-score">
                          {Math.round(
                            restaurantScores[result._id]?.overallAverageScore ||
                              0
                          )}
                        </div>
                      </div>

                      <div className="result-content">
                        <div className="cuisine-info">
                          <span className="cuisine-label">Cuisine:</span>
                          <span className="cuisine-types">
                            {result.cuisine && result.cuisine.length > 0
                              ? result.cuisine.join(", ")
                              : "Not specified"}
                          </span>
                        </div>

                        <div className="address-info">
                          <span className="address-label">📍</span>
                          <span className="address-text">
                            {result.address
                              ? `${result.address.street}, ${result.address.city}, ${result.address.province}`
                              : "Address not available"}
                          </span>
                        </div>

                        <div className="scores-section">
                          <div className="score-item">
                            <span className="score-label">Admin</span>
                            <span className="score-value">
                              {Math.round(
                                restaurantScores[result._id]
                                  ?.adminAverageScore || 0
                              )}
                            </span>
                          </div>
                          <div className="score-item">
                            <span className="score-label">Community</span>
                            <span className="score-value">
                              {Math.round(
                                restaurantScores[result._id]
                                  ?.communityAverageScore || 0
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-results-container">
                  <p className="no-results-message">
                    No food reviews yet for {citySelected.city},{" "}
                    {citySelected.province}
                  </p>
                  <p className="no-results-suggestion">
                    Be the first to review a restaurant in this city!
                  </p>
                  <button
                    className="make-review-btn-inline"
                    onClick={handleCreateReviewClick}
                  >
                    Make a Review
                  </button>
                </div>
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
                    <div className="result-header">
                      <div className="rank-number">#{index + 1}</div>
                      <h3 className="food-name">
                        {item?.foodItem?.name || "Unnamed Food Item"}
                      </h3>
                      <div className="overall-score">
                        {Math.round(item.overallAverageScore || 0)}
                      </div>
                    </div>

                    <div className="result-content">
                      <div
                        className="restaurant-info clickable"
                        onClick={() =>
                          navigate(
                            `/restaurant/${item?.foodItem?.restaurant?._id}`
                          )
                        }
                      >
                        <span className="restaurant-label">🏪 Restaurant:</span>
                        <span className="restaurant-name-link">
                          {item?.foodItem?.restaurant?.name ||
                            "Unknown Restaurant"}
                        </span>
                      </div>

                      <div className="address-info">
                        <span className="address-label">📍</span>
                        <span className="address-text">
                          {item?.foodItem?.restaurant?.address
                            ? `${
                                item.foodItem.restaurant.address.street ||
                                "No street"
                              }, ${
                                item.foodItem.restaurant.address.city ||
                                "No city"
                              }, ${
                                item.foodItem.restaurant.address.province ||
                                "No province"
                              }`
                            : "Address not available"}
                        </span>
                      </div>

                      <div className="scores-section">
                        <div className="score-item">
                          <span className="score-label">Admin</span>
                          <span className="score-value">
                            {Math.round(item.adminScore || 0)}
                          </span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">Community</span>
                          <span className="score-value">
                            {Math.round(item.communityScore || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results-container">
                  <p className="no-results-message">
                    No food reviews yet for {citySelected.city},{" "}
                    {citySelected.province}
                  </p>
                  <p className="no-results-suggestion">
                    Be the first to review a restaurant in this city!
                  </p>
                  <button
                    className="make-review-btn-inline"
                    onClick={handleCreateReviewClick}
                  >
                    Make a Review
                  </button>
                </div>
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
