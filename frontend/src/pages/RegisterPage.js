import React, { useState } from "react";
import axios from "../api/axios";
import CitySearch from "../components/CitySearch";
import { useNavigate } from "react-router-dom";
import "../styles/RegisterPage.css";

function RegisterPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "", // Added
    lastName: "", // Added
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    sex: "male",
    city: "",
    province: "",
    country: "",
    maritalStatus: "single",
    occupation: "",
    incomeRange: "<25k",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateStep1 = () => {
    let newErrors = {};
    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    return newErrors;
  };

  const validateStep2 = () => {
    let newErrors = {};
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else if (!formData.city) {
      newErrors.city = "City is required";
    } else if (!formData.province) {
      newErrors.province = "Province is required";
    } else if (!formData.country) {
      newErrors.country = "Country is required";
    }
    return newErrors;
  };

  const validateStep3 = () => {
    let newErrors = {};
    if (!formData.occupation) {
      newErrors.occupation = "Occupation is required";
    }
    return newErrors;
  };

  const handleNext = async () => {
    let validationErrors = {};
    if (step === 1) {
      validationErrors = validateStep1();
      if (Object.keys(validationErrors).length === 0) {
        try {
          const response = await axios.post("/api/users/checkAvailability", {
            username: formData.username,
            email: formData.email,
          });

          if (response.status === 200) {
            setStep((prev) => prev + 1);
            setErrors({});
          }
        } catch (error) {
          if (
            error.response &&
            error.response.data.message ===
              "Username or email is already taken."
          ) {
            setErrors({ username: "Username or email is already taken." });
          } else {
            setErrors({
              form: "An error occurred while checking availability.",
            });
          }
        }
      } else {
        setErrors(validationErrors);
      }
    } else if (step === 2) {
      validationErrors = validateStep2();
      if (Object.keys(validationErrors).length === 0) {
        setStep((prev) => prev + 1);
        setErrors({});
      } else {
        setErrors(validationErrors);
      }
    }
  };

  const handlePrev = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let validationErrors = validateStep3();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const location = {
        city: formData.city,
        province: formData.province,
        country: formData.country,
      };

      const registrationResponse = await axios.post("/api/users", {
        ...formData,
        location,
      });
      console.log("Registration successful:", registrationResponse.data);

      const loginResponse = await axios.post("/api/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      console.log("Login response:", loginResponse.data);
      localStorage.setItem("token", loginResponse.data.token);
      navigate("/profile");
    } catch (err) {
      console.error("Registration or login failed:", err);
      if (err.response && err.response.data.message) {
        if (err.response.data.message.includes("username")) {
          setErrors({ username: "Username is already taken." });
        } else if (err.response.data.message.includes("email")) {
          setErrors({ email: "An account with this email already exists." });
        } else {
          setErrors({ form: err.response.data.message });
        }
      } else {
        setErrors({ form: "Registration failed. Please try again." });
      }
    }
  };

  return (
    <div className="register-page">
      <h2>Register</h2>

      {step === 1 && (
        <form className="register-form">
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="register-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="register-input"
          />
          <input
            type="text"
            placeholder="First Name (Optional)"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            className="register-input"
          />
          <input
            type="text"
            placeholder="Last Name (Optional)"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            className="register-input"
          />
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="register-input password-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
            </button>
          </div>
          <div className="password-container">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="register-input password-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={toggleConfirmPasswordVisibility}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              <i
                className={
                  showConfirmPassword ? "fa fa-eye-slash" : "fa fa-eye"
                }
              ></i>
            </button>
          </div>
          {errors.username && (
            <span className="error-text">{errors.username}</span>
          )}
          {errors.email && <span className="error-text">{errors.email}</span>}
          {errors.password && (
            <span className="error-text">{errors.password}</span>
          )}
          {errors.confirmPassword && (
            <span className="error-text">{errors.confirmPassword}</span>
          )}
          {errors.submit && <span className="error-text">{errors.submit}</span>}
          <button type="button" onClick={handleNext} className="register-btn">
            Next
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="register-form">
          <input
            type="date"
            placeholder="Date of Birth"
            value={formData.dateOfBirth}
            onChange={(e) =>
              setFormData({ ...formData, dateOfBirth: e.target.value })
            }
            className="register-input"
          />
          <select
            value={formData.sex}
            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
            className="register-input"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <CitySearch
            onSelectCity={(selectedCity) =>
              setFormData({
                ...formData,
                city: selectedCity.city,
                province: selectedCity.province,
                country: selectedCity.country,
              })
            }
          />
          <input
            type="text"
            placeholder="City"
            value={formData.city}
            className="register-input"
            readOnly
          />
          <input
            type="text"
            placeholder="Province"
            value={formData.province}
            className="register-input"
            readOnly
          />
          <input
            type="text"
            placeholder="Country"
            value={formData.country}
            className="register-input"
            readOnly
          />
          {errors.dateOfBirth && (
            <span className="error-text">{errors.dateOfBirth}</span>
          )}
          {errors.city && <span className="error-text">{errors.city}</span>}
          {errors.province && (
            <span className="error-text">{errors.province}</span>
          )}
          {errors.country && (
            <span className="error-text">{errors.country}</span>
          )}
          <button type="button" onClick={handlePrev} className="register-btn">
            Back
          </button>
          <button type="button" onClick={handleNext} className="register-btn">
            Next
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="register-form">
          <select
            value={formData.maritalStatus}
            onChange={(e) =>
              setFormData({ ...formData, maritalStatus: e.target.value })
            }
            className="register-input"
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
          <input
            type="text"
            placeholder="Occupation"
            value={formData.occupation}
            onChange={(e) =>
              setFormData({ ...formData, occupation: e.target.value })
            }
            className="register-input"
          />
          <select
            value={formData.incomeRange}
            onChange={(e) =>
              setFormData({ ...formData, incomeRange: e.target.value })
            }
            className="register-input"
          >
            <option value="<25k">{"<25k"}</option>
            <option value="25k-50k">25k-50k</option>
            <option value="50k-75k">50k-75k</option>
            <option value="75k-100k">75k-100k</option>
            <option value="100k-150k">100k-150k</option>
            <option value=">150k">{">150k"}</option>
          </select>
          {errors.occupation && (
            <span className="error-text">{errors.occupation}</span>
          )}
          <button type="button" onClick={handlePrev} className="register-btn">
            Back
          </button>
          <button type="submit" className="register-btn">
            Register
          </button>
        </form>
      )}
    </div>
  );
}

export default RegisterPage;
