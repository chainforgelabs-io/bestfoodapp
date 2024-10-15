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
import Navbar from "./components/Navbar"; // Assuming you have a Navbar component for navigation
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <Router>
      <div>
        {/* Add Navbar if needed */}
        <Navbar />

        {/* Route configuration */}
        <Routes>
          <Route path="/" element={<HomePage />} />
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
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
