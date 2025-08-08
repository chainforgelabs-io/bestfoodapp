import React, { useState } from "react";
import axios from "../api/axios";
import { useNavigate, useLocation } from "react-router-dom";
import StandardizedDropdown from "../components/StandardizedDropdown";
import {
  RESTAURANT_TYPES,
  CUISINE_TYPES,
  AMBIANCE_OPTIONS,
} from "../utils/standardizedOptions";
import SEO from "../components/SEO";

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
    cuisine: [],
    ambiance: [],
    street: "",
    postalCode: "",
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(""); // State for success messages
  const navigate = useNavigate();

  const handleChange = (e) => {
    setRestaurantData({ ...restaurantData, [e.target.name]: e.target.value });
  };

  const handleDropdownChange = (field, value) => {
    setRestaurantData({ ...restaurantData, [field]: value });
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
        `/addresses`,
        addressData,
        config
      );
      const addressId = addressResponse.data._id;

      const restaurantPayload = {
        name: restaurantData.name,
        address: addressId,
        type: restaurantData.type,
        cuisine: Array.isArray(restaurantData.cuisine)
          ? restaurantData.cuisine
          : [restaurantData.cuisine],
        ambiance: Array.isArray(restaurantData.ambiance)
          ? restaurantData.ambiance
          : [],
      };

      await axios.post(`/restaurants`, restaurantPayload, config);
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
      <SEO
        title="Add a Restaurant | Best Food App"
        description="Add a new restaurant to the Best Food App database."
        noindex={true}
      />
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

        <StandardizedDropdown
          label="Restaurant Type"
          placeholder="Select restaurant type"
          options={RESTAURANT_TYPES}
          value={restaurantData.type}
          onChange={(value) => handleDropdownChange("type", value)}
          required={true}
        />

        <StandardizedDropdown
          label="Cuisine Types"
          placeholder="Select cuisine types"
          options={CUISINE_TYPES}
          value={restaurantData.cuisine}
          onChange={(value) => handleDropdownChange("cuisine", value)}
          allowMultiple={true}
          required={true}
        />

        <StandardizedDropdown
          label="Ambiance (Optional)"
          placeholder="Select ambiance characteristics"
          options={AMBIANCE_OPTIONS}
          value={restaurantData.ambiance}
          onChange={(value) => handleDropdownChange("ambiance", value)}
          allowMultiple={true}
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
