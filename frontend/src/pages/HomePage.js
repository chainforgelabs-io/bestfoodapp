// src/pages/HomePage.js
import React, { useState } from "react";
import axios from "axios";
import "../styles/HomePage.css"; // Create this file for styling

function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewScore, setReviewScore] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`/api/restaurants?search=${searchTerm}`);
      setResults(response.data);
    } catch (error) {
      console.error("There was an error with the search!", error);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const reviewData = {
        restaurantId: selectedRestaurant._id,
        comment: reviewText,
        score: reviewScore,
        // Additional fields like userId can be added here
      };
      await axios.post("/api/reviews", reviewData);
      alert("Review submitted successfully!");
      // Clear form after submission
      setSelectedRestaurant(null);
      setReviewText("");
      setReviewScore("");
    } catch (error) {
      console.error("There was an error submitting the review!", error);
    }
  };

  return (
    <div>
      <h2>Home</h2>
      {/* Search Form */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search restaurants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {/* Search Results */}
      <div className="search-results">
        {results.length > 0 ? (
          results.map((result) => (
            <div
              key={result._id}
              className="search-result-item"
              onClick={() => setSelectedRestaurant(result)}
            >
              <h3>{result.name}</h3>
              <p>{result.cuisine.join(", ")}</p>
              <p>{result.address.city}</p>
            </div>
          ))
        ) : (
          <p>No results found.</p>
        )}
      </div>

      {/* Review Submission */}
      {selectedRestaurant && (
        <div className="review-form-container">
          <h3>Submit a Review for {selectedRestaurant.name}</h3>
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
