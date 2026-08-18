import React, { useMemo, useState } from "react";
import axios from "../api/axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/RegisterPage.css";
import SEO from "../components/SEO";
import tokenUtils from "../utils/auth";

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/profile";

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthYear: "",
    ageConfirmed: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const birthYears = useMemo(() => {
    const now = new Date().getFullYear();
    const years = [];
    for (let y = now - 13; y >= now - 120; y -= 1) {
      years.push(y);
    }
    return years;
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!formData.email.includes("@"))
      newErrors.email = "Enter a valid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.birthYear) newErrors.birthYear = "Birth year is required";
    if (!formData.ageConfirmed)
      newErrors.ageConfirmed = "Confirm you are 13 or older";
    return newErrors;
  };

  const safeNext = (path) =>
    path && path.startsWith("/") && !path.startsWith("//") ? path : "/profile";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await axios.post("/users", {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        birthYear: Number(formData.birthYear),
        ageConfirmed: true,
      });

      const loginResponse = await axios.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
        keepLoggedIn: true,
      });

      tokenUtils.setToken(loginResponse.data.token, true);
      navigate(safeNext(nextPath));
    } catch (err) {
      console.error("Registration or login failed:", err);
      if (err.response && err.response.data.message) {
        const msg = err.response.data.message;
        if (msg.includes("username") && msg.includes("email")) {
          setErrors({ username: "Username or email is already taken." });
        } else if (msg.toLowerCase().includes("username")) {
          setErrors({ username: "Username is already taken." });
        } else if (msg.toLowerCase().includes("email")) {
          setErrors({ email: "An account with this email already exists." });
        } else {
          setErrors({ form: msg });
        }
      } else {
        setErrors({ form: "Registration failed. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <SEO
        title="Register | Best Food App"
        description="Create an account to submit reviews and personalize your experience."
        noindex={true}
      />
      <h2>Create an account</h2>

      <form onSubmit={handleSubmit} className="register-form">
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          className="register-input"
          autoComplete="username"
        />
        {errors.username && (
          <span className="error-text">{errors.username}</span>
        )}

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="register-input"
          autoComplete="email"
        />
        {errors.email && <span className="error-text">{errors.email}</span>}

        <div className="password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="register-input password-input"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
          </button>
        </div>
        {errors.password && (
          <span className="error-text">{errors.password}</span>
        )}

        <div className="password-container">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            className="register-input password-input"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={
              showConfirmPassword ? "Hide confirm password" : "Show password"
            }
          >
            <i
              className={showConfirmPassword ? "fa fa-eye-slash" : "fa fa-eye"}
            ></i>
          </button>
        </div>
        {errors.confirmPassword && (
          <span className="error-text">{errors.confirmPassword}</span>
        )}

        <div className="input-group">
          <label htmlFor="birthYear" className="input-label">
            Birth year
          </label>
          <select
            id="birthYear"
            value={formData.birthYear}
            onChange={(e) =>
              setFormData({ ...formData, birthYear: e.target.value })
            }
            className="register-input"
          >
            <option value="">Select year</option>
            {birthYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {errors.birthYear && (
          <span className="error-text">{errors.birthYear}</span>
        )}

        <label className="age-confirm-row" htmlFor="ageConfirmed">
          <input
            id="ageConfirmed"
            type="checkbox"
            checked={formData.ageConfirmed}
            onChange={(e) =>
              setFormData({ ...formData, ageConfirmed: e.target.checked })
            }
          />
          <span>I confirm I am 13 or older</span>
        </label>
        {errors.ageConfirmed && (
          <span className="error-text">{errors.ageConfirmed}</span>
        )}

        {errors.form && <span className="error-text">{errors.form}</span>}

        <button
          type="submit"
          className="register-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p>
        Already have an account?{" "}
        <Link
          to={
            nextPath && nextPath !== "/profile"
              ? `/login?next=${encodeURIComponent(nextPath)}`
              : "/login"
          }
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
