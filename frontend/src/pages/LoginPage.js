import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";
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
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/login`,
        { email, password, keepLoggedIn }
      );

      console.log("Login successful:", data);
      localStorage.setItem("token", data.token);

      // Store the keep logged in preference and expiration info for future reference
      if (keepLoggedIn) {
        localStorage.setItem("keepLoggedIn", "true");
        console.log("Extended session enabled - token expires in 30 days");
      } else {
        localStorage.removeItem("keepLoggedIn");
        console.log("Standard session - token expires in 1 hour");
      }

      // Log token expiration time for user info
      if (data.expiresIn) {
        console.log(`Session duration: ${data.expiresIn}`);
      }

      navigate("/profile");
    } catch (err) {
      console.error("Login failed:", err.response ? err.response.data : err);
      setError("Invalid email or password");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/users/forgot-password`,
        { email: forgotEmail }
      );

      setResetMessage("Password reset email sent. Please check your inbox.");
    } catch (err) {
      console.error(
        "Failed to send password reset:",
        err.response ? err.response.data : err
      );
      setResetMessage("Failed to send reset email. Please try again.");
    }
  };

  return (
    <div className="login-page">
      {isForgotPassword ? (
        <>
          <h2>Forgot Password</h2>
          {resetMessage && <p className="success-text">{resetMessage}</p>}
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
              />
            </div>
            <button type="submit" className="login-btn">
              Send Reset Email
            </button>
          </form>
          <p>
            Remember your password?{" "}
            <span
              onClick={() => setIsForgotPassword(false)}
              className="login-link"
              style={{
                cursor: "pointer",
                color: "blue",
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
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input"
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
                  className="login-input password-input"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
              />
              <label htmlFor="keepLoggedIn" className="checkbox-label">
                Keep me logged in
              </label>
            </div>
            <button type="submit" className="login-btn">
              Login
            </button>
          </form>

          <p>
            Forgot your password?{" "}
            <span
              onClick={() => setIsForgotPassword(true)}
              className="login-link"
              style={{
                cursor: "pointer",
                color: "blue",
                textDecoration: "underline",
              }}
            >
              Reset it here
            </span>
          </p>
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </>
      )}
    </div>
  );
};

export default LoginPage;
