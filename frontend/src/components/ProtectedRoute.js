import React from "react";
import { Navigate } from "react-router-dom";
import tokenUtils from "../utils/auth";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = tokenUtils.isAuthenticated();

  // Log authentication status for debugging
  if (!isAuthenticated) {
    console.log("Access denied: User not authenticated");
    const tokenInfo = tokenUtils.getTokenInfo();
    if (tokenInfo) {
      console.log("Token info:", tokenInfo);
    }
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
