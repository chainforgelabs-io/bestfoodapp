import React, { useState, useEffect } from "react";
import tokenUtils from "../utils/auth";

const AuthDebug = ({ show = false }) => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (isVisible) {
      const info = tokenUtils.getAuthDebugInfo();
      setDebugInfo(info);
    }
  }, [isVisible]);

  const refreshDebugInfo = () => {
    const info = tokenUtils.getAuthDebugInfo();
    setDebugInfo(info);
    console.log("🔍 Authentication Debug Info:", info);
  };

  const testTokenStorage = () => {
    try {
      const testToken = "test_token_" + Date.now();
      localStorage.setItem("test_token", testToken);
      const retrieved = localStorage.getItem("test_token");
      localStorage.removeItem("test_token");

      const result = retrieved === testToken;
      console.log("📦 localStorage test:", result ? "✅ WORKING" : "❌ FAILED");
      alert(`localStorage test: ${result ? "WORKING" : "FAILED"}`);
    } catch (error) {
      console.error("📦 localStorage test failed:", error);
      alert("localStorage test FAILED: " + error.message);
    }
  };

  const clearAuthData = () => {
    if (
      window.confirm("Clear all authentication data? You will be logged out.")
    ) {
      tokenUtils.clearToken();
      setDebugInfo(tokenUtils.getAuthDebugInfo());
      window.location.reload();
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "#b08bd4",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          fontSize: "20px",
          cursor: "pointer",
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
        title="Show Auth Debug"
      >
        🔍
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 10000,
        padding: "20px",
        overflow: "auto",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "20px",
          maxWidth: "800px",
          margin: "0 auto",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0, color: "#b08bd4" }}>
            🔍 Authentication Debug Panel
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            ✕ Close
          </button>
        </div>

        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={refreshDebugInfo}
            style={{
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            🔄 Refresh Info
          </button>
          <button
            onClick={testTokenStorage}
            style={{
              background: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            📦 Test localStorage
          </button>
          <button
            onClick={clearAuthData}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            🗑️ Clear Auth Data
          </button>
        </div>

        <div
          style={{
            background: "#f8f9fa",
            padding: "15px",
            borderRadius: "4px",
            border: "1px solid #dee2e6",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>
            Current Status
          </h4>
          <div
            style={{
              color: tokenUtils.isAuthenticated() ? "#28a745" : "#dc3545",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {tokenUtils.isAuthenticated()
              ? "✅ AUTHENTICATED"
              : "❌ NOT AUTHENTICATED"}
          </div>
        </div>

        {debugInfo && (
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ color: "#495057" }}>Debug Information:</h4>
            <pre
              style={{
                background: "#f8f9fa",
                padding: "15px",
                borderRadius: "4px",
                border: "1px solid #dee2e6",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            background: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "4px",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>
            📝 Troubleshooting Tips:
          </h4>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#856404" }}>
            <li>Check if localStorage is available and working</li>
            <li>Verify token is not expired (check expiresAt)</li>
            <li>Ensure keepLoggedIn flag is set correctly</li>
            <li>Check browser developer tools for network errors</li>
            <li>Try clearing all site data and logging in again</li>
            <li>Check if you're in private/incognito mode</li>
          </ul>
        </div>

        <div
          style={{
            marginTop: "20px",
            fontSize: "10px",
            color: "#6c757d",
            textAlign: "center",
          }}
        >
          Environment: {process.env.NODE_ENV} | User Agent:{" "}
          {navigator.userAgent.substring(0, 50)}...
        </div>
      </div>
    </div>
  );
};

export default AuthDebug;
