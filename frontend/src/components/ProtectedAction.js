import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedAction = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" />;
  }
  return children;
};

export default ProtectedAction;
