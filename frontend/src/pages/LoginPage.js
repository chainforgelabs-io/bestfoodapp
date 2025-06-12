import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";
import tokenUtils from "../utils/auth";
import Notification from "../components/Notification";
import "../styles/LoginPage.css"; // Style your page accordingly

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false); // New state for forgot password
  const [resetMessage, setResetMessage] = useState(""); // Message for reset email sent
  const [isLoading, setIsLoading] = useState(false);

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: "error",
    message: "",
  });

  const navigate = useNavigate();

  // Check if user is already logged in when component mounts
  useEffect(() => {
    if (tokenUtils.isAuthenticated()) {
      console.log("User is already authenticated, redirecting to profile");
      const tokenInfo = tokenUtils.getTokenInfo();
      if (tokenInfo) {
        console.log("Current token info:", tokenInfo);
      }
      navigate("/profile");
    }

    // Add global debug function for production troubleshooting
    window.authDebug = () => {
      const debugInfo = tokenUtils.getAuthDebugInfo();
      console.log("🔍 Authentication Debug Info:", debugInfo);

      // Test localStorage
      try {
        const testKey = "test_storage_" + Date.now();
        localStorage.setItem(testKey, "test");
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        console.log(
          "📦 localStorage test:",
          retrieved === "test" ? "✅ WORKING" : "❌ FAILED"
        );
      } catch (error) {
        console.error("📦 localStorage error:", error);
      }

      return debugInfo;
    };

    console.log(
      "💡 Debug tip: Run authDebug() in console for authentication diagnostics"
    );
  }, [navigate]);

  // Clear error when user starts typing
  useEffect(() => {
    if (error && (email || password)) {
      setError("");
    }
  }, [email, password, error]);

  const showNotification = (message, type = "error") => {
    setNotification({
      show: true,
      type,
      message,
    });
  };

  const hideNotification = () => {
    setNotification({
      show: false,
      type: "error",
      message: "",
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Basic validation
    if (!email || !password) {
      showNotification("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (!email.includes("@")) {
      showNotification("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(`/auth/login`, {
        email,
        password,
        keepLoggedIn,
      });

      console.log("Login successful:", data);

      // Use token utilities to store the token
      tokenUtils.setToken(data.token, keepLoggedIn);

      // Log token information for debugging
      const tokenInfo = tokenUtils.getTokenInfo();
      if (tokenInfo) {
        console.log("Token stored successfully:", {
          expiresAt: tokenInfo.expiresAt,
          hoursUntilExpiry: tokenInfo.hoursUntilExpiry,
          keepLoggedIn: tokenInfo.keepLoggedIn,
          sessionDuration: data.expiresIn,
        });
      }

      // Show success notification
      showNotification("Welcome back! Redirecting...", "success");

      // Additional logging for debugging
      if (keepLoggedIn) {
        console.log("✅ Extended session enabled - token expires in 30 days");
        console.log(
          "localStorage keepLoggedIn:",
          localStorage.getItem("keepLoggedIn")
        );

        // Additional debug info for production troubleshooting
        const debugInfo = tokenUtils.getAuthDebugInfo();
        console.log("🔍 Full auth debug info after login:", debugInfo);
      } else {
        console.log("⏰ Standard session - token expires in 1 hour");
      }

      // Delay navigation to show success message
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (err) {
      console.error("Login failed:", err.response ? err.response.data : err);

      // More specific error messages
      if (err.response) {
        const { status, data } = err.response;

        switch (status) {
          case 400:
            showNotification("Invalid email or password format");
            break;
          case 401:
            showNotification("Incorrect email or password. Please try again.");
            break;
          case 403:
            showNotification(
              "Account is temporarily locked. Please try again later."
            );
            break;
          case 404:
            showNotification("No account found with this email address");
            break;
          case 429:
            showNotification(
              "Too many login attempts. Please wait and try again."
            );
            break;
          case 500:
            showNotification("Server error. Please try again later.");
            break;
          default:
            showNotification(
              data?.message || "Login failed. Please try again."
            );
        }
      } else if (err.request) {
        showNotification(
          "Network error. Please check your connection and try again."
        );
      } else {
        showNotification("Something went wrong. Please try again.");
      }

      setError("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!forgotEmail) {
      showNotification("Please enter your email address");
      setIsLoading(false);
      return;
    }

    if (!forgotEmail.includes("@")) {
      showNotification("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(`/users/forgot-password`, {
        email: forgotEmail,
      });

      setResetMessage("Password reset email sent. Please check your inbox.");
      showNotification("Password reset email sent successfully!", "success");
    } catch (err) {
      console.error(
        "Failed to send password reset:",
        err.response ? err.response.data : err
      );

      if (err.response?.status === 404) {
        showNotification("No account found with this email address");
      } else if (err.response?.status === 429) {
        showNotification("Too many reset attempts. Please wait and try again.");
      } else {
        showNotification("Failed to send reset email. Please try again.");
      }

      setResetMessage("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Notification Component */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.show}
        onClose={hideNotification}
        duration={notification.type === "success" ? 2000 : 4000}
      />

      {isForgotPassword ? (
        <>
          <h2>Forgot Password</h2>
          {resetMessage && !notification.show && (
            <p
              className={
                resetMessage.includes("sent") ? "success-text" : "error-text"
              }
            >
              {resetMessage}
            </p>
          )}
          <form
            onSubmit={handleForgotPassword}
            className="forgot-password-form"
          >
            <div className="form-group">
              <input
                type="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="login-input"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className={`login-btn ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>
          <p>
            Remember your password?{" "}
            <span
              onClick={() => setIsForgotPassword(false)}
              className="login-link"
              style={{
                cursor: "pointer",
                color: "#b08bd4",
                textDecoration: "underline",
              }}
            >
              Login here
            </span>
          </p>
        </>
      ) : (
        <>
          <h2>Login</h2>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`login-input ${
                  error && !notification.show ? "error" : ""
                }`}
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`login-input password-input ${
                    error && !notification.show ? "error" : ""
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  <i
                    className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}
                  ></i>
                </button>
              </div>
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="keepLoggedIn"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="login-checkbox"
                disabled={isLoading}
              />
              <label htmlFor="keepLoggedIn" className="checkbox-label">
                Keep me logged in (30 days)
              </label>
            </div>
            <button
              type="submit"
              className={`login-btn ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </form>
          <p>
            Forgot your password?{" "}
            <span
              onClick={() => setIsForgotPassword(true)}
              className="login-link"
              style={{
                cursor: "pointer",
                color: "#b08bd4",
                textDecoration: "underline",
              }}
            >
              Reset it here
            </span>
          </p>
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="login-link">
              Sign up here
            </Link>
          </p>
        </>
      )}
    </div>
  );
};

export default LoginPage;
