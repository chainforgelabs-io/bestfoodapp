import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";
import "../styles/LoginPage.css"; // Style your page accordingly

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send login request to backend
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/login`,
        { email, password }
      );

      console.log("Login successful:", data);

      // Store token in localStorage
      localStorage.setItem("token", data.token);

      // Redirect to the profile page or home page
      navigate("/profile");
    } catch (err) {
      console.error("Login failed:", err.response ? err.response.data : err);
      setError("Invalid email or password");
    }
  };

  return (
    <div className="login-page">
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
        </div>
        <button type="submit" className="login-btn">
          Login
        </button>
      </form>

      {/* Add link to register page */}
      <p>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default LoginPage;
