import React, { useEffect, useState } from "react";
import axios from "../api/axios"; // Correct import of axios
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import tokenUtils from "../utils/auth";
import "../styles/ProfilePage.css";

function ProfilePage() {
  const [user, setUser] = useState({});
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

        // Fetch user details from localhost:5000
        const userResponse = await axios.get(`/api/users/${userId}`);
        console.log("User details response:", userResponse);

        // Access the 'user' object inside 'data' and set it
        const userData = userResponse.data.user;
        setUser(userData);

        // Set review count, followers count, and following count
        setReviewCount(userData.reviews.length || 0);
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

  return (
    <div className="profile-container">
      <div className="user-info">
        <img
          src={user.profilePicture}
          alt="Profile"
          className="profile-picture"
        />
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

      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
}

export default ProfilePage;
