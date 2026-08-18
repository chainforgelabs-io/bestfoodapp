// Authentication utility functions
import { jwtDecode } from "jwt-decode";

export const AUTH_CHANGED_EVENT = "auth-changed";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export const tokenUtils = {
  // Get token from localStorage with error handling
  getToken: () => {
    try {
      return localStorage.getItem("token");
    } catch (error) {
      console.error("Error accessing localStorage for token:", error);
      return null;
    }
  },

  // Set token in localStorage with error handling and additional metadata
  setToken: (token, keepLoggedIn = true) => {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("tokenSetAt", Date.now().toString());

      if (keepLoggedIn) {
        localStorage.setItem("keepLoggedIn", "true");
        // Store the expected expiration based on the token
        const decoded = jwtDecode(token);
        localStorage.setItem("tokenExpectedExp", decoded.exp.toString());
      } else {
        localStorage.removeItem("keepLoggedIn");
        localStorage.removeItem("tokenExpectedExp");
      }

      console.log("✅ Token stored successfully", {
        keepLoggedIn,
        tokenLength: token.length,
        setAt: new Date().toISOString(),
      });
      notifyAuthChanged();
    } catch (error) {
      console.error("Error storing token in localStorage:", error);
    }
  },

  // Remove token and related data
  clearToken: () => {
    try {
      const items = ["token", "keepLoggedIn", "tokenSetAt", "tokenExpectedExp"];
      items.forEach((item) => localStorage.removeItem(item));
      console.log("🧹 Authentication data cleared");
      notifyAuthChanged();
    } catch (error) {
      console.error("Error clearing token from localStorage:", error);
    }
  },

  // Check if user had "keep logged in" enabled
  isKeepLoggedIn: () => {
    try {
      return localStorage.getItem("keepLoggedIn") === "true";
    } catch (error) {
      console.error("Error checking keepLoggedIn status:", error);
      return false;
    }
  },

  // Enhanced token validation with better error handling
  isTokenValid: () => {
    const token = tokenUtils.getToken();
    if (!token) {
      console.log("❌ No token found");
      return false;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = decoded.exp - currentTime;

      // Log token status for debugging
      console.log("🔍 Token validation:", {
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry),
        hoursLeft: Math.round(timeUntilExpiry / 3600),
        isValid: timeUntilExpiry > 60, // Give 1 minute buffer
      });

      // Use smaller buffer for more accurate validation
      const buffer = 60; // 1 minute in seconds
      const isValid = decoded.exp > currentTime + buffer;

      if (!isValid) {
        console.log("❌ Token has expired");
        // Don't auto-clear here, let the app handle it
      }

      return isValid;
    } catch (error) {
      console.error("❌ Error validating token:", error);
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
    const isValid = tokenUtils.isTokenValid();
    console.log(
      "🔐 Authentication check:",
      isValid ? "✅ AUTHENTICATED" : "❌ NOT AUTHENTICATED"
    );
    return isValid;
  },

  // Debug function to get complete authentication state
  getAuthDebugInfo: () => {
    try {
      const token = tokenUtils.getToken();
      const keepLoggedIn = tokenUtils.isKeepLoggedIn();
      const tokenSetAt = localStorage.getItem("tokenSetAt");
      const expectedExp = localStorage.getItem("tokenExpectedExp");

      let tokenInfo = null;
      if (token) {
        try {
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          tokenInfo = {
            userId: decoded.id,
            issuedAt: new Date(decoded.iat * 1000).toISOString(),
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
            timeUntilExpiry: Math.round(decoded.exp - currentTime),
            hoursUntilExpiry: Math.round((decoded.exp - currentTime) / 3600),
            isExpired: decoded.exp <= currentTime,
          };
        } catch (e) {
          tokenInfo = { error: "Failed to decode token" };
        }
      }

      return {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        keepLoggedIn,
        tokenSetAt: tokenSetAt
          ? new Date(parseInt(tokenSetAt)).toISOString()
          : null,
        expectedExp: expectedExp
          ? new Date(parseInt(expectedExp) * 1000).toISOString()
          : null,
        tokenInfo,
        localStorage: {
          available: typeof Storage !== "undefined",
          itemCount: localStorage.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: "Failed to get debug info",
        details: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default tokenUtils;
