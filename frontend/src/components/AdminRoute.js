import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "../api/axios";
import tokenUtils from "../utils/auth";

function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading"); // loading | allowed | denied

  useEffect(() => {
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
