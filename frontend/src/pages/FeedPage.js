import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/FeedPage.css"; // Create this file for styling

function FeedPage() {
  const [localReviews, setLocalReviews] = useState([]);
  const [followedReviews, setFollowedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("date"); // Sorting option

  const userId = "loggedInUserId"; // Replace with actual logged-in user ID
  const userLocation = "userLocation"; // Replace with actual user location (e.g., city, region)

  useEffect(() => {
    const fetchFeedData = async () => {
      try {
        // Fetch local reviews
        const localReviewsResponse = await axios.get(
          `/reviews/local?location=${userLocation}`
        );
        setLocalReviews(localReviewsResponse.data);

        // Fetch reviews from followed users
        const followedReviewsResponse = await axios.get(
          `/reviews/followed?userId=${userId}`
        );
        setFollowedReviews(followedReviewsResponse.data);

        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        console.error("Error fetching feed data", error);
        setLoading(false);
      }
    };

    fetchFeedData();
  }, [userLocation, userId]);

  // Handle sorting change
  const handleSortChange = (option) => {
    setSortOption(option);
    // Sorting logic (example: sort by date)
    if (option === "rating") {
      setLocalReviews([...localReviews].sort((a, b) => b.score - a.score));
      setFollowedReviews(
        [...followedReviews].sort((a, b) => b.score - a.score)
      );
    } else if (option === "date") {
      setLocalReviews(
        [...localReviews].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
      setFollowedReviews(
        [...followedReviews].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
    }
  };

  // Handle like action
  const handleLike = (reviewId) => {
    console.log(`Liked review with ID: ${reviewId}`);
    // Implement backend call to register like
  };

  // Handle comment action
  const handleComment = (reviewId, comment) => {
    console.log(`Commented on review with ID: ${reviewId}: ${comment}`);
    // Implement backend call to register comment
  };

  return (
    <div className="feed-container">
      {/* Loading State */}
      {loading ? (
        <p>Loading reviews...</p>
      ) : (
        <>
          {/* Sorting Options */}
          <div className="sort-options">
            <label>Sort by: </label>
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="date">Most Recent</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Local Reviews Section */}
          <div className="local-reviews">
            <h3>Local Reviews</h3>
            {localReviews.length > 0 ? (
              localReviews.map((review) => (
                <div key={review._id} className="review-item">
                  <h4>{review.restaurant.name}</h4>
                  <p>
                    <strong>Comment:</strong> {review.comment}
                  </p>
                  <p>
                    <strong>Score:</strong> {review.score}/10
                  </p>
                  <p>
                    <small>
                      Reviewed on:{" "}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </small>
                  </p>
                  <button onClick={() => handleLike(review._id)}>Like</button>
                  <button
                    onClick={() => handleComment(review._id, "Great review!")}
                  >
                    Comment
                  </button>
                </div>
              ))
            ) : (
              <p>No local reviews available.</p>
            )}
          </div>

          {/* Followed Users' Reviews Section */}
          <div className="followed-reviews">
            <h3>Reviews from People You Follow</h3>
            {followedReviews.length > 0 ? (
              followedReviews.map((review) => (
                <div key={review._id} className="review-item">
                  <h4>{review.restaurant.name}</h4>
                  <p>
                    <strong>Comment:</strong> {review.comment}
                  </p>
                  <p>
                    <strong>Score:</strong> {review.score}/10
                  </p>
                  <p>
                    <small>
                      Reviewed by: {review.user.username} on{" "}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </small>
                  </p>
                  <button onClick={() => handleLike(review._id)}>Like</button>
                  <button
                    onClick={() => handleComment(review._id, "Nice review!")}
                  >
                    Comment
                  </button>
                </div>
              ))
            ) : (
              <p>No reviews from followed users available.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FeedPage;
