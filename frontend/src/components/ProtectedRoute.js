import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import tokenUtils from "../utils/auth";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = tokenUtils.isAuthenticated();
  const location = useLocation();

  if (isAuthenticated) return children;

  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?next=${next}`} replace />;
};

export default ProtectedRoute;
