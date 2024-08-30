// src/pages/ProfilePage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/ProfilePage.css"; // Create this file for styling

function ProfilePage() {
  const [user, setUser] = useState({});
  const [reviews, setReviews] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const userId = "loggedInUserId"; // Replace with actual logged-in user ID

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await axios.get(`/api/users/${userId}`);
        setUser(userResponse.data);

        const reviewsResponse = await axios.get(`/api/users/${userId}/reviews`);
        setReviews(reviewsResponse.data);

        const followersResponse = await axios.get(
          `/api/users/${userId}/followers`
        );
        setFollowers(followersResponse.data);

        const followingResponse = await axios.get(
          `/api/users/${userId}/following`
        );
        setFollowing(followingResponse.data);
      } catch (error) {
        console.error("Error fetching user data", error);
      }
    };

    fetchUserData();
  }, [userId]);

  return (
    <div className="profile-container">
      {/* User Info */}
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

      {/* User Reviews */}
      <div className="user-reviews">
        <h3>Your Reviews</h3>
        <ul>
          {reviews.map((review) => (
            <li key={review._id}>
              <p>
                <strong>Restaurant:</strong> {review.restaurant.name}
              </p>
              <p>
                <strong>Comment:</strong> {review.comment}
              </p>
              <p>
                <strong>Score:</strong> {review.score}/10
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Followers */}
      <div className="followers-section">
        <h3>Followers</h3>
        <ul>
          {followers.map((follower) => (
            <li key={follower._id}>{follower.username}</li>
          ))}
        </ul>
      </div>

      {/* Following */}
      <div className="following-section">
        <h3>Following</h3>
        <ul>
          {following.map((user) => (
            <li key={user._id}>{user.username}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ProfilePage;
