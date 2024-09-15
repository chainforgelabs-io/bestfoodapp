import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import "../styles/HomePage.css";

function HomePage() {
  const [searchTerm, setSearchTerm] = useState(""); // To capture the city search term
  const [citySelected, setCitySelected] = useState(""); // Selected city
  const [results, setResults] = useState([]); // To store search results
  const [foodItems, setFoodItems] = useState([]); // Food item search results
  const [showReviewForm, setShowReviewForm] = useState(false); // To toggle review form visibility
  const [reviewText, setReviewText] = useState("");
  const [reviewScore, setReviewScore] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [foodSearchTerm, setFoodSearchTerm] = useState(""); // Food item search term
  const navigate = useNavigate(); // Initialize navigate

  // Search for restaurants by city
  const handleCitySearch = async (e) => {
    e.preventDefault();
    setHasSearched(true); // Mark as searched when the form is submitted

    const formattedCity = capitalizeWords(searchTerm); // Capitalize city name

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/search`,
        { params: { city: formattedCity } }
      );
      setResults(response.data);
      setCitySelected(formattedCity); // Set the formatted city as selected
      setSearchTerm(""); // Clear city search term after selection
    } catch (error) {
      console.error("Error searching restaurants by city:", error);
      alert("No restaurants found in this city");
      setResults([]);
    }
  };

  // Helper function to capitalize the first letter of each word
  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
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

  const handleResetCity = () => {
    setSearchTerm(""); // Clear the search input field
    setResults([]); // Clear the search results
    setCitySelected(""); // Clear the selected city
    setHasSearched(false); // Reset the hasSearched flag to its initial state
  };

  // Handle review creation, checking for user authentication
  const handleCreateReviewClick = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to perform this action.");
      navigate("/login"); // Redirect to login page if not authenticated
    } else {
      setShowReviewForm(true); // Show review form if authenticated
    }
  };

  // Handle form submission for reviews
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
      setShowReviewForm(false); // Hide form after submission
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  return (
    <div>
      <h2>
        {citySelected ? `Best Food in ${citySelected}` : "Search for City"}
      </h2>

      {/* Search Form - No Authentication Required */}

      {!citySelected && (
        <form onSubmit={handleCitySearch} className="search-form">
          <input
            type="text"
            placeholder="Enter city"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      )}

      {citySelected && (
        <div>
          <form onSubmit={handleFoodSearch} className="search-form">
            <input
              type="text"
              placeholder={`Search for food in ${citySelected}`}
              value={foodSearchTerm}
              onChange={(e) => setFoodSearchTerm(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="food-results">
            {foodItems.length > 0
              ? foodItems.map((item, index) => (
                  <div key={item._id} className="food-result-item">
                    <h3>
                      {index + 1}. {item.name}
                    </h3>
                    <p>
                      Restaurant: {item.restaurant.name} (
                      {item.restaurant.address.street},{" "}
                      {item.restaurant.address.city})
                    </p>
                    <p>
                      Admin Score: {item.adminScore}, Community Score:{" "}
                      {item.communityScore}
                    </p>
                  </div>
                ))
              : hasSearched && <p>No food items found.</p>}
          </div>
        </div>
      )}
      {/* Reset City Button */}
      <div>
        <button onClick={handleResetCity} className="reset-button">
          Reset City
        </button>
      </div>

      {/* Create a Review Button */}
      <button
        className="create-review-btn"
        onClick={handleCreateReviewClick} // Check login status on button click
      >
        Create a Review
      </button>

      {/* Search Results */}
      <div className="search-results">
        {
          results.length > 0
            ? results.map((result) => (
                <div key={result._id} className="search-result-item">
                  <h3>{result.name}</h3>
                  <p>{result.cuisine.join(", ")}</p>
                  <p>
                    {result.address.street}, {result.address.city},{" "}
                    {result.address.province}, {result.address.country}
                  </p>
                </div>
              ))
            : hasSearched && <p>No results found.</p> // Only show "No results found" after searching
        }
      </div>

      {/* Review Submission Form */}
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
