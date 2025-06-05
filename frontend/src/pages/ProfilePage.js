import React, { useEffect, useState } from "react";
import axios from "../api/axios"; // Correct import of axios
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import tokenUtils from "../utils/auth";
import "../styles/ProfilePage.css";

function ProfilePage() {
  const [user, setUser] = useState({});
  const [reviews, setReviews] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      // Check if user is authenticated
      if (!tokenUtils.isAuthenticated()) {
        console.log("User not authenticated, redirecting to login");
        navigate("/login");
        return;
      }

      const token = tokenUtils.getToken();
      try {
        const decodedToken = jwtDecode(token);
        console.log("Decoded token:", decodedToken);

        const userId = decodedToken.id;
        console.log("User ID from token:", userId);

        // Log token information for debugging
        const tokenInfo = tokenUtils.getTokenInfo();
        if (tokenInfo) {
          console.log("Current session info:", {
            expiresAt: tokenInfo.expiresAt,
            hoursUntilExpiry: tokenInfo.hoursUntilExpiry,
            keepLoggedIn: tokenInfo.keepLoggedIn,
          });
        }

        // Fetch user details and reviews from localhost:5000
        const userResponse = await axios.get(`/api/users/${userId}`);
        console.log("User details response:", userResponse);

        // Access the 'user' object inside 'data' and set it
        const userData = userResponse.data.user;
        const userReviews = userResponse.data.reviews || [];

        setUser(userData);
        setReviews(userReviews);

        // Set review count, followers count, and following count
        setReviewCount(userReviews.length);
        setFollowerCount(userData.followers.length || 0);
        setFollowingCount(userData.following.length || 0);
      } catch (error) {
        console.error("Error fetching user data", error);
        // If there's an error (like token expiry), redirect to login
        tokenUtils.clearToken();
        navigate("/login");
      }
    };

    fetchUserData();
  }, [navigate]);

  // Enhanced logout function to clear all authentication data
  const handleLogout = () => {
    console.log("Logging out user");
    tokenUtils.clearToken();
    console.log("Authentication data cleared");
    navigate("/login"); // Redirect to login page
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 80) return "#28a745"; // Green
    if (score >= 60) return "#ffc107"; // Yellow
    if (score >= 40) return "#fd7e14"; // Orange
    return "#dc3545"; // Red
  };

  // Navigate to restaurant page
  const handleReviewClick = (restaurantId) => {
    if (restaurantId) {
      navigate(`/restaurant/${restaurantId}`);
    }
  };

  return (
    <div className="profile-container">
      <div className="user-info">
        {/* <img
          src={user.profilePicture}
          alt="Profile"
          className="profile-picture"
        /> */}
        <h2>{user.username}</h2>
        <p>{user.bio}</p>
        <p>Total Points: {user.points}</p>
      </div>

      <div className="user-stats">
        <p>
          <strong>Reviews:</strong> {reviewCount}
        </p>
        <p>
          <strong>Followers:</strong> {followerCount}
        </p>
        <p>
          <strong>Following:</strong> {followingCount}
        </p>
      </div>

      {/* User Reviews Section */}
      {reviews.length > 0 && (
        <div className="user-reviews-section">
          <h3>My Reviews ({reviewCount})</h3>
          <div className="reviews-grid">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="review-card clickable"
                onClick={() => handleReviewClick(review.restaurantId?._id)}
                title={`Go to ${
                  review.restaurantId?.name || "restaurant"
                } page`}
              >
                <div className="review-header">
                  <h4>{review.foodItem?.name || "Food Item"}</h4>
                  <div
                    className="review-score"
                    style={{ color: getScoreColor(review.score) }}
                  >
                    {review.score}/100
                  </div>
                </div>

                <div className="restaurant-info">
                  <p>
                    <strong>{review.restaurantId?.name || "Restaurant"}</strong>
                  </p>
                  {review.restaurantId?.cuisine && (
                    <p className="cuisine">
                      {review.restaurantId.cuisine.join(", ")}
                    </p>
                  )}
                </div>

                {review.comment && (
                  <p className="review-comment">"{review.comment}"</p>
                )}

                <div className="review-details">
                  <span className="category">{review.foodItem?.category}</span>
                  {review.foodItem?.price && (
                    <span className="price">${review.foodItem.price}</span>
                  )}
                </div>

                <div className="review-date">
                  {formatDate(review.reviewDate)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug info - remove in production
      {process.env.NODE_ENV === "development" && (
        <div
          className="debug-info"
          style={{
            marginTop: "20px",
            padding: "10px",
            background: "#f0f0f0",
            borderRadius: "5px",
          }}
        >
          <h4>Session Debug Info:</h4>
          <pre>{JSON.stringify(tokenUtils.getTokenInfo(), null, 2)}</pre>
        </div>
      )} */}

      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
}

export default ProfilePage;
