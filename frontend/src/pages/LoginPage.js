import React, { useState } from "react";
import axios from "axios";
import "../styles/LoginPage.css"; // Style your page accordingly

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Make API call to login the user
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      });
      // Save token to localStorage or sessionStorage
      localStorage.setItem("token", response.data.token);
      console.log("Login successful!");
      // Redirect to the Home page or Profile page after login
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;
