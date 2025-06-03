import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CitySearch from "../components/CitySearch"; // Adjust the path if necessary
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

  // Search for restaurants by city, province, and country
  const handleCitySearch = async (e) => {
    e.preventDefault();

    if (
      !citySelected ||
      !citySelected.city ||
      !citySelected.province ||
      !citySelected.country
    ) {
      // Just return without the alert - the form validation will handle this
      return;
    }

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
      console.log(response.data);
      setResults(response.data);
      setHasSearched(true); // Mark search as performed
      setActiveFilter("Restaurants"); // Default to restaurants after city search
    } catch (error) {
      console.error("Error searching restaurants by city:", error);
      setResults([]);
      setHasSearched(true); // Still mark search as performed even if no results
      setActiveFilter("Restaurants"); // Default to restaurants after city search
    }
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
              province: citySelected.province,
              country: citySelected.country,
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
        console.error("Error searching restaurants:", error);
        setResults([]); // Clear results on error
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
              onSelectCity={setCitySelected}
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
                      <h3>
                        {index + 1}. {result.name}
                      </h3>
                      <div>
                        <p>
                          {result.cuisine
                            ? result.cuisine.join(", ")
                            : "No cuisine info available"}
                        </p>
                        <p>
                          {result.address
                            ? `${result.address.street}, ${result.address.city}, ${result.address.province}, ${result.address.country}`
                            : "No address info available"}
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
                    <h3>
                      {index + 1}. {item?.foodItem?.name || "Unnamed Food Item"}
                    </h3>
                    <p
                      onClick={() =>
                        navigate(
                          `/restaurant/${item?.foodItem?.restaurant?._id}`
                        )
                      }
                    >
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
