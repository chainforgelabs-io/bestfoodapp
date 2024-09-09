import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedAction = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You must be logged in to perform this action.");
    return <Navigate to="/login" />;
  }
  return children;
};

export default ProtectedAction;
