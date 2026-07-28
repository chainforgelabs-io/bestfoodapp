import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import axios from "../api/axios";
import tokenUtils, { AUTH_CHANGED_EVENT } from "../utils/auth";

function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading"); // loading | allowed | denied

  const checkAccess = useCallback(() => {
    if (!tokenUtils.isAuthenticated()) {
      setStatus("denied");
      return;
    }

    axios
      .get("/users/profile")
      .then((res) => {
        if (res.data?.role === "admin") {
          setStatus("allowed");
        } else {
          setStatus("denied");
        }
      })
      .catch(() => setStatus("denied"));
  }, []);

  useEffect(() => {
    checkAccess();
    window.addEventListener(AUTH_CHANGED_EVENT, checkAccess);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, checkAccess);
  }, [checkAccess]);

  if (status === "loading") {
    return (
      <div style={{ padding: "120px 24px", textAlign: "center", color: "#666" }}>
        Checking admin access…
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
