// src/pages/LeaderboardsPage.js
import React, { useState, useEffect } from "react";
import "./LeaderboardsPage.css"; // Import your CSS file for styling

function LeaderboardsPage() {
  const [leaderboards, setLeaderboards] = useState([]);
  const [category, setCategory] = useState("restaurants"); // Default category
  const [sortOption, setSortOption] = useState("rating"); // Default sort option
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    const fetchData = async () => {
      try {
        // Simulate API call delay
        setLoading(true);
        const simulatedData = [
          {
            _id: 1,
            name: "Restaurant A",
            averageRating: 9.1,
            totalReviews: 150,
          },
          {
            _id: 2,
            name: "Restaurant B",
            averageRating: 8.7,
            totalReviews: 95,
          },
          {
            _id: 3,
            name: "Restaurant C",
            averageRating: 8.5,
            totalReviews: 120,
          },
        ];
        setTimeout(() => {
          setLeaderboards(simulatedData);
          setLoading(false);
        }, 1000); // 1 second delay
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [category, sortOption]);

  return (
    <div className="leaderboards-container">
      {/* Loading State */}
      {loading ? (
        <p>Loading leaderboards...</p>
      ) : (
        <>
          {/* Category Filter */}
          <div className="category-filter">
            <label>Category: </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="restaurants">Top Restaurants</option>
              <option value="dishes">Top Dishes</option>
              <option value="cuisines">Top Cuisines</option>
              <option value="ambiance">Top Ambiance</option>
            </select>
          </div>

          {/* Sorting Options */}
          <div className="sort-options">
            <label>Sort by: </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviewed</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>

          {/* Leaderboards Display */}
          <div className="leaderboards-list">
            <h3>
              Leaderboard -{" "}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            {leaderboards.length > 0 ? (
              leaderboards.map((item, index) => (
                <div key={item._id} className="leaderboard-item">
                  <h4>
                    #{index + 1} - {item.name}
                  </h4>
                  <p>
                    <strong>Rating:</strong> {item.averageRating}/10
                  </p>
                  <p>
                    <strong>Reviews:</strong> {item.totalReviews}
                  </p>
                </div>
              ))
            ) : (
              <p>No data available for this category.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default LeaderboardsPage;
