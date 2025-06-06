// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RestaurantPage from "./pages/RestaurantPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import FeedPage from "./pages/FeedPage";
import LeaderboardsPage from "./pages/LeaderboardsPage";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ReviewSubmissionPage from "./pages/ReviewSubmissionPage";
import ReviewSuccessPage from "./pages/ReviewSuccessPage";
import AddRestaurantPage from "./pages/AddRestaurantPage";

function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* City-specific routes for SEO */}
          <Route path="/city/:cityName" element={<HomePage />} />
          <Route path="/city/:cityName/:province" element={<HomePage />} />
          <Route
            path="/city/:cityName/:province/:country"
            element={<HomePage />}
          />

          {/* Leaderboard city routes */}
          <Route
            path="/leaderboards/:cityName"
            element={<LeaderboardsPage />}
          />
          <Route
            path="/leaderboards/:cityName/:province"
            element={<LeaderboardsPage />}
          />
          <Route
            path="/leaderboards/:cityName/:province/:country"
            element={<LeaderboardsPage />}
          />

          {/* Existing routes */}
          <Route
            path="/restaurant/:restaurantID"
            element={<RestaurantPage />}
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/submit-review"
            element={
              <ProtectedRoute>
                <ReviewSubmissionPage />
              </ProtectedRoute>
            }
          />
          <Route path="/review-success" element={<ReviewSuccessPage />} />
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
          <Route
            path="/add-restaurant"
            element={
              <ProtectedRoute>
                <AddRestaurantPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
