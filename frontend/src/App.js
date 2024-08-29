// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import FeedPage from "./pages/FeedPage";
import LeaderboardsPage from "./pages/LeaderboardsPage";
import Navbar from "./components/Navbar"; // Assuming you have a Navbar component for navigation

function App() {
  return (
    <Router>
      <div>
        {/* Add Navbar if needed */}
        <Navbar />

        {/* Route configuration */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
