import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";
import Logo from "../assets/logo.png"; // Import your logo here

function HomePage() {
  const [searchTerm, setSearchTerm] = useState(""); // City search term
  const [citySelected, setCitySelected] = useState(""); // Selected city
  const [results, setResults] = useState([]); // Search results
  const [foodItems, setFoodItems] = useState([]); // Food search results
  const [showReviewForm, setShowReviewForm] = useState(false); // Review form visibility
  const [reviewText, setReviewText] = useState(""); // Review text
  const [reviewScore, setReviewScore] = useState(""); // Review score
  const [hasSearched, setHasSearched] = useState(false); // Whether search was performed
  const [foodSearchTerm, setFoodSearchTerm] = useState(""); // Food item search term
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
    } catch (error) {
      console.error("Error searching restaurants by city:", error);
      alert("No restaurants found in this city");
      setResults([]);
    }
  };

  // Search for food items in the selected city
  const handleFoodSearch = async (e) => {
    e.preventDefault();

    if (!citySelected) {
      alert("Please select a city first.");
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/food-items/rank/category/${foodSearchTerm}/city/${citySelected}`
      );

      setFoodItems(
        response.data.sort(
          (a, b) =>
            (b.adminScore + b.communityScore) / 2 -
            (a.adminScore + a.communityScore) / 2
        )
      ); // Sort food items by rank (best to worst)
    } catch (error) {
      console.error("Error searching food items:", error);
      alert("No food items found in this city for the selected category.");
      setFoodItems([]);
    }
  };

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

  // Render the initial layout (before search) or the layout after the search
  return (
    <div className="home-container">
      {/* Check if a search has been performed */}
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
          {/* New layout (post-search) */}
          <div className="logo-container">
            <img src={Logo} alt="Best Food App Logo" className="app-logo" />
          </div>
          <h1 className="home-title">Find the best food in {citySelected}</h1>

          <form onSubmit={handleFoodSearch} className="search-form">
            <input
              type="text"
              placeholder={`Search for food in ${citySelected}`}
              value={foodSearchTerm}
              onChange={(e) => setFoodSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <i className="fa fa-search"></i>
            </button>
          </form>

          {/* Add the buttons and list layout based on the second image */}
          <div className="filter-section">
            <button className="filter-button">Food</button>
            <button className="filter-button">Restaurants</button>
          </div>

          <div className="food-results">
            {foodItems.length > 0 ? (
              foodItems.map((item, index) => (
                <div key={item._id} className="food-result-item">
                  <h3>
                    {index + 1}. {item.name}
                  </h3>
                  <p>
                    {item.restaurant.name} ({item.restaurant.address.street},{" "}
                    {item.restaurant.address.city})
                  </p>
                  <p>
                    Admin Score: {item.adminScore}, Community Score:{" "}
                    {item.communityScore}
                  </p>
                </div>
              ))
            ) : (
              <p>No food items found in this category.</p>
            )}
          </div>
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
              placeholder="Score (1-10)"
              value={reviewScore}
              onChange={(e) => setReviewScore(e.target.value)}
              required
              min="1"
              max="10"
            />
            <button type="submit">Submit Review</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default HomePage;
