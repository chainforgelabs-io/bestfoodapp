import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import Notification from "./Notification";
import StandardizedDropdown from "./StandardizedDropdown";
import {
  FOOD_CATEGORIES,
  FOOD_TYPES,
  FOOD_SUBTYPES,
  DIETARY_TAGS,
  SIZE_OPTIONS,
} from "../utils/standardizedOptions";
import "../styles/EditFoodItemModal.css";

function EditFoodItemModal({ isOpen, onClose, foodItem, onFoodItemUpdated }) {
  const [editedFoodItem, setEditedFoodItem] = useState({
    name: "",
    category: "",
    type: "",
    subType: "",
    size: "",
    price: "",
    tags: [],
  });

  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "error",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Populate the form when foodItem changes or modal opens
  useEffect(() => {
    if (isOpen && foodItem) {
      setEditedFoodItem({
        name: foodItem.name || "",
        category: foodItem.category || "",
        type: foodItem.type || "",
        subType: foodItem.subType || "",
        size: foodItem.sizeOptions || foodItem.size || "",
        price: foodItem.price || "",
        tags: Array.isArray(foodItem.tags) ? foodItem.tags : [],
      });
    }
  }, [isOpen, foodItem]);

  // Handle dropdown changes for standardized fields
  const handleDropdownChange = (field, value) => {
    setEditedFoodItem({ ...editedFoodItem, [field]: value });

    // Auto-clear dependent fields when category changes
    if (field === "category") {
      setEditedFoodItem((prev) => ({
        ...prev,
        category: value,
        type: "",
        subType: "",
      }));
    } else if (field === "type") {
      setEditedFoodItem((prev) => ({
        ...prev,
        type: value,
        subType: "",
      }));
    }
  };

  // Get available types based on selected category
  const getAvailableTypes = () => {
    return editedFoodItem.category
      ? FOOD_TYPES[editedFoodItem.category] || []
      : [];
  };

  // Get available subtypes based on selected type
  const getAvailableSubtypes = () => {
    return editedFoodItem.type ? FOOD_SUBTYPES[editedFoodItem.type] || [] : [];
  };

  const handleSave = async () => {
    if (
      !editedFoodItem.name ||
      !editedFoodItem.category ||
      !editedFoodItem.type
    ) {
      setNotification({
        isVisible: true,
        message: "Food name, category, and type are required.",
        type: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setNotification({
          isVisible: true,
          message: "You must be logged in to edit food items.",
          type: "error",
        });
        setIsLoading(false);
        return;
      }

      // Debug: Check token
      console.log("Token exists:", !!token);
      console.log("Token length:", token.length);

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      // Prepare the updated food item data
      const updatedFoodItemData = {
        name: editedFoodItem.name,
        category: editedFoodItem.category,
        type: editedFoodItem.type,
        subType: editedFoodItem.subType || "",
        price: parseFloat(editedFoodItem.price) || 0,
        tags: Array.isArray(editedFoodItem.tags) ? editedFoodItem.tags : [],
        sizeOptions:
          editedFoodItem.size && editedFoodItem.size.trim() !== ""
            ? editedFoodItem.size
            : undefined,
      };

      console.log("Updating food item:", updatedFoodItemData);

      const response = await axios.put(
        `/api/food-items/${foodItem._id}`,
        updatedFoodItemData,
        config
      );

      const updatedFoodItem = response.data;
      console.log("Food item updated successfully:", updatedFoodItem);

      // Call the callback to update the parent component
      onFoodItemUpdated(updatedFoodItem);

      setNotification({
        isVisible: true,
        message: "Food item updated successfully!",
        type: "success",
      });

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        setNotification({ ...notification, isVisible: false });
      }, 1500);
    } catch (error) {
      console.error("Error updating food item:", error);

      // Better error handling for different types of errors
      if (error.response?.status === 401) {
        setNotification({
          isVisible: true,
          message:
            "Your session has expired. Please log in again to edit food items.",
          type: "error",
        });
      } else if (error.response?.status === 403) {
        setNotification({
          isVisible: true,
          message: "You don't have permission to edit this food item.",
          type: "error",
        });
      } else {
        setNotification({
          isVisible: true,
          message: `Error updating food item: ${
            error.response?.data?.message || error.message
          }`,
          type: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNotification({ ...notification, isVisible: false });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="edit-modal">
        <div className="modal-header">
          <h3>Edit Food Item</h3>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label className="form-label">Food Name *</label>
            <input
              type="text"
              placeholder="e.g., Birria Tacos, Cheeseburger, Margherita Pizza"
              value={editedFoodItem.name}
              onChange={(e) =>
                setEditedFoodItem({ ...editedFoodItem, name: e.target.value })
              }
              required
              className="form-input"
            />
          </div>

          <StandardizedDropdown
            label="Category"
            placeholder="Select food category"
            options={FOOD_CATEGORIES}
            value={editedFoodItem.category}
            onChange={(value) => handleDropdownChange("category", value)}
            required={true}
          />

          <StandardizedDropdown
            label="Type"
            placeholder={
              editedFoodItem.category
                ? "Select food type"
                : "Select category first"
            }
            options={getAvailableTypes()}
            value={editedFoodItem.type}
            onChange={(value) => handleDropdownChange("type", value)}
            disabled={!editedFoodItem.category}
            required={true}
          />

          <StandardizedDropdown
            label="Sub-type (Optional)"
            placeholder={
              editedFoodItem.type ? "Select sub-type" : "Select type first"
            }
            options={getAvailableSubtypes()}
            value={editedFoodItem.subType}
            onChange={(value) => handleDropdownChange("subType", value)}
            disabled={!editedFoodItem.type}
          />

          <StandardizedDropdown
            label="Size (Optional)"
            placeholder="Select size"
            options={SIZE_OPTIONS}
            value={editedFoodItem.size}
            onChange={(value) => handleDropdownChange("size", value)}
          />

          <div className="form-group">
            <label className="form-label">Price (Optional)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g., 6.99"
              value={editedFoodItem.price}
              onChange={(e) =>
                setEditedFoodItem({ ...editedFoodItem, price: e.target.value })
              }
              className="form-input"
            />
          </div>

          <StandardizedDropdown
            label="Tags (Optional)"
            placeholder="Select dietary tags"
            options={DIETARY_TAGS}
            value={editedFoodItem.tags}
            onChange={(value) => handleDropdownChange("tags", value)}
            allowMultiple={true}
          />
        </div>

        <div className="modal-footer">
          <button
            onClick={handleClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Notification */}
        <Notification
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={() => setNotification({ ...notification, isVisible: false })}
        />
      </div>
    </div>
  );
}

export default EditFoodItemModal;
