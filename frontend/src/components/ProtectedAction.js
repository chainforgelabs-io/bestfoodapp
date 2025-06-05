import React from "react";
import { Navigate } from "react-router-dom";
import tokenUtils from "../utils/auth";

const ProtectedAction = ({ children }) => {
  const isAuthenticated = tokenUtils.isAuthenticated();

  if (!isAuthenticated) {
    console.log("Protected action denied: User not authenticated");
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedAction;
