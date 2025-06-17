import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import StandardizedDropdown from "./StandardizedDropdown";
import {
  RESTAURANT_TYPES,
  CUISINE_TYPES,
  AMBIANCE_OPTIONS,
} from "../utils/standardizedOptions";
import "../styles/RestaurantModal.css";

function RestaurantModal({ isOpen, onClose, locationData, onRestaurantAdded }) {
  const [restaurantData, setRestaurantData] = useState({
    name: "",
    type: "",
    cuisine: [],
    ambiance: [],
    street: "",
    postalCode: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  const handleChange = (e) => {
    setRestaurantData({ ...restaurantData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleDropdownChange = (field, value) => {
    setRestaurantData({ ...restaurantData, [field]: value });
    // Clear error when user makes a selection
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrors({ submit: "You must be logged in to add a restaurant." });
        setIsSubmitting(false);
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Create address first
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

      // Create restaurant with standardized data
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

      const restaurantResponse = await axios.post(
        `/restaurants`,
        restaurantPayload,
        config
      );

      // Reset form
      setRestaurantData({
        name: "",
        type: "",
        cuisine: [],
        ambiance: [],
        street: "",
        postalCode: "",
      });

      // Call success callback with the new restaurant data
      onRestaurantAdded(restaurantResponse.data);

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error adding restaurant:", error);
      setErrors({
        submit:
          error.response?.data?.message ||
          "Failed to add restaurant. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRestaurantData({
      name: "",
      type: "",
      cuisine: [],
      ambiance: [],
      street: "",
      postalCode: "",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Restaurant</h2>
          <p className="modal-subtitle">
            Adding to {locationData.city}, {locationData.province},{" "}
            {locationData.country}
          </p>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Restaurant Name *</label>
            <input
              type="text"
              name="name"
              placeholder="Enter restaurant name"
              value={restaurantData.name}
              onChange={handleChange}
              required
              className="form-input"
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Street Address *</label>
            <input
              type="text"
              name="street"
              placeholder="Enter street address"
              value={restaurantData.street}
              onChange={handleChange}
              required
              className="form-input"
            />
            {errors.street && (
              <span className="form-error">{errors.street}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Postal Code *</label>
            <input
              type="text"
              name="postalCode"
              placeholder="Enter postal code"
              value={restaurantData.postalCode}
              onChange={handleChange}
              required
              className="form-input"
            />
            {errors.postalCode && (
              <span className="form-error">{errors.postalCode}</span>
            )}
          </div>

          <StandardizedDropdown
            label="Restaurant Type"
            placeholder="Select restaurant type"
            options={RESTAURANT_TYPES}
            value={restaurantData.type}
            onChange={(value) => handleDropdownChange("type", value)}
            required={true}
          />
          {errors.type && <span className="form-error">{errors.type}</span>}

          <StandardizedDropdown
            label="Cuisine Types"
            placeholder="Select cuisine types"
            options={CUISINE_TYPES}
            value={restaurantData.cuisine}
            onChange={(value) => handleDropdownChange("cuisine", value)}
            allowMultiple={true}
            required={true}
          />
          {errors.cuisine && (
            <span className="form-error">{errors.cuisine}</span>
          )}

          <StandardizedDropdown
            label="Ambiance (Optional)"
            placeholder="Select ambiance characteristics"
            options={AMBIANCE_OPTIONS}
            value={restaurantData.ambiance}
            onChange={(value) => handleDropdownChange("ambiance", value)}
            allowMultiple={true}
          />

          {errors.submit && <div className="form-error">{errors.submit}</div>}

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="modal-button btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Restaurant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RestaurantModal;
