// Authentication utility functions
import { jwtDecode } from "jwt-decode";

export const tokenUtils = {
  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem("token");
  },

  // Set token in localStorage
  setToken: (token, keepLoggedIn = false) => {
    localStorage.setItem("token", token);
    if (keepLoggedIn) {
      localStorage.setItem("keepLoggedIn", "true");
    } else {
      localStorage.removeItem("keepLoggedIn");
    }
  },

  // Remove token and related data
  clearToken: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("keepLoggedIn");
  },

  // Check if user had "keep logged in" enabled
  isKeepLoggedIn: () => {
    return localStorage.getItem("keepLoggedIn") === "true";
  },

  // Check if token exists and is valid
  isTokenValid: () => {
    const token = tokenUtils.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      // Add a small buffer (5 minutes) to account for network delays
      const buffer = 5 * 60; // 5 minutes in seconds
      return decoded.exp > currentTime + buffer;
    } catch (error) {
      console.error("Error decoding token:", error);
      return false;
    }
  },

  // Get token expiration info for debugging
  getTokenInfo: () => {
    const token = tokenUtils.getToken();
    if (!token) return null;

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = decoded.exp - currentTime;

      return {
        isValid: decoded.exp > currentTime,
        expiresAt: new Date(decoded.exp * 1000),
        timeUntilExpiry: timeUntilExpiry,
        hoursUntilExpiry: Math.floor(timeUntilExpiry / 3600),
        minutesUntilExpiry: Math.floor((timeUntilExpiry % 3600) / 60),
        keepLoggedIn: tokenUtils.isKeepLoggedIn(),
      };
    } catch (error) {
      console.error("Error getting token info:", error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return tokenUtils.isTokenValid();
  },
};

export default tokenUtils;
