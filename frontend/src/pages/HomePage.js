import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import "../styles/HomePage.css";

function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewScore, setReviewScore] = useState("");
  const navigate = useNavigate(); // Initialize navigate

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`/api/restaurants?search=${searchTerm}`);
      setResults(response.data);
    } catch (error) {
      console.error("Error searching restaurants by city:", error);
    }
  };

  const handleCreateReviewClick = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to perform this action.");
      navigate("/login"); // Redirect to login page if not authenticated
    } else {
      setShowReviewForm(true); // Show review form if authenticated
    }
  };

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
      <h2>Home</h2>

      {/* Search Form - No Authentication Required */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search restaurants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {/* Create a Review Button */}
      <button
        className="create-review-btn"
        onClick={handleCreateReviewClick} // Check login status on button click
      >
        Create a Review
      </button>

      {/* Search Results */}
      <div className="search-results">
        {results.length > 0 ? (
          results.map((result) => (
            <div key={result._id} className="search-result-item">
              <h3>{result.name}</h3>
              <p>{result.cuisine.join(", ")}</p>
              <p>{result.address.city}</p>
            </div>
          ))
        ) : (
          <p>No results found.</p>
        )}
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
