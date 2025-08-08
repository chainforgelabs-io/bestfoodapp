import React, { useState } from "react";
import axios from "../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/RegisterPage.css"; // Reusing the register page styles
import SEO from "../components/SEO";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // Success message

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    console.log("Resetting password with token:", token); // Log the token being used
    console.log("New password being set:", password); // Log the password input by the user

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await axios.post(`/users/reset-password/${token}`, {
        password,
      });
      console.log("Password reset successful:", response.data);
      setSuccessMessage("Password reset successfully. Redirecting to login...");
      setTimeout(() => {
        navigate("/login"); // Redirect to login after successful reset
      }, 2000); // 2 second delay
    } catch (err) {
      console.error("Error resetting password:", err.response || err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    }
  };

  return (
    <div className="reset-password-page">
      <SEO
        title="Reset Password | Best Food App"
        description="Reset your password securely."
        noindex={true}
      />
      <h2>Reset Password</h2>
      <form className="register-form" onSubmit={handlePasswordReset}>
        <div className="password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="register-input"
            required
          />
          <button
            type="button"
            className="toggle-password-btn"
            onClick={togglePasswordVisibility}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="password-container">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="register-input"
            required
          />
          <button
            type="button"
            className="toggle-password-btn"
            onClick={toggleConfirmPasswordVisibility}
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
        {successMessage && (
          <p className="success-text">{successMessage}</p>
        )}{" "}
        {/* Success message */}
        <button type="submit" className="register-btn">
          Reset Password
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
