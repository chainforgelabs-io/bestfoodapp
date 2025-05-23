import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

function AddRestaurantPage() {
  const { state } = useLocation();
  const { formData } = state || {};
  const locationData = formData?.location || {
    city: "Unknown",
    province: "Unknown",
    country: "Unknown",
  };

  const [restaurantData, setRestaurantData] = useState({
    name: "",
    type: "",
    cuisine: "",
    ambiance: "",
    street: "",
    postalCode: "",
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(""); // State for success messages
  const navigate = useNavigate();

  const handleChange = (e) => {
    setRestaurantData({ ...restaurantData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const addressData = {
        street: restaurantData.street,
        city: locationData.city,
        province: locationData.province,
        country: locationData.country,
        postalCode: restaurantData.postalCode,
      };

      const addressResponse = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/addresses`,
        addressData,
        config
      );
      const addressId = addressResponse.data._id;

      const restaurantPayload = {
        name: restaurantData.name,
        address: addressId,
        type: restaurantData.type,
        cuisine: restaurantData.cuisine.split(",").map((item) => item.trim()),
        ambiance: restaurantData.ambiance
          ? restaurantData.ambiance.split(",").map((item) => item.trim())
          : [],
      };

      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/restaurants`,
        restaurantPayload,
        config
      );
      setSuccessMessage("Restaurant added successfully!"); // Display success message
      navigate("/submit-review", { state: { formData, step: 2 } }); // Go back to Step 2 with form data
    } catch (error) {
      console.error("Error adding restaurant:", error);
      setErrors({ submit: "Failed to add restaurant" });
    }
  };

  const handleBack = () => {
    navigate("/submit-review", {
      state: { formData: { ...formData, location: locationData }, step: 2 },
    });
    // Navigate back to Step 2
  };

  return (
    <div className="add-restaurant-form-container">
      <h2>
        Add a New Restaurant for {locationData.city}, {locationData.province},{" "}
        {locationData.country}
      </h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Restaurant Name"
          value={restaurantData.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="street"
          placeholder="Street Address"
          value={restaurantData.street}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="postalCode"
          placeholder="Postal Code"
          value={restaurantData.postalCode}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="type"
          placeholder="Type (e.g., Casual Dining)"
          value={restaurantData.type}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="cuisine"
          placeholder="Cuisine (e.g., American, Italian)"
          value={restaurantData.cuisine}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="ambiance"
          placeholder="Ambiance (e.g., Cozy, Family-Friendly)"
          value={restaurantData.ambiance}
          onChange={handleChange}
        />
        <div className="button-container">
          <button type="button" onClick={handleBack}>
            Back
          </button>
          <button type="submit">Add Restaurant</button>
        </div>
      </form>
      {successMessage && <p className="success-text">{successMessage}</p>}
      {errors.submit && <p className="error-text">{errors.submit}</p>}
    </div>
  );
}

export default AddRestaurantPage;
