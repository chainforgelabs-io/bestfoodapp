import React, { useEffect, useState } from "react";
import axios from "../api/axios"; // Correct import of axios
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";

function ProfilePage() {
  const [user, setUser] = useState({});
  const [reviewCount, setReviewCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          console.log("Decoded token:", decodedToken);

          const userId = decodedToken.id;
          console.log("User ID from token:", userId);

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
        }
      }
    };

    fetchUserData();
  }, [token]);

  // Logout function to clear the token and redirect to the login page
  const handleLogout = () => {
    localStorage.removeItem("token");
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
