import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import Notification from "./Notification";
import EditFoodItemModal from "./EditFoodItemModal";
import SuccessOverlay from "./SuccessOverlay";
import StandardizedDropdown from "./StandardizedDropdown";
import {
  FOOD_CATEGORIES,
  FOOD_TYPES,
  FOOD_SUBTYPES,
  DIETARY_TAGS,
  SIZE_OPTIONS,
} from "../utils/standardizedOptions";
import "../styles/FoodItemForm.css";

function FoodItemForm({
  restaurantId,
  onFoodItemsUpdated,
  existingFoodItems = [],
}) {
  const [foodItem, setFoodItem] = useState({
    name: "",
    category: "",
    type: "",
    subType: "",
    size: "",
    price: "",
    tags: [],
  });

  const [foodItems, setFoodItems] = useState([]); // Store added food items
  const [foodSuggestions, setFoodSuggestions] = useState([]); // Store suggestions from search
  const [showFoodSuggestions, setShowFoodSuggestions] = useState(false); // Control dropdown
  const [activeSuggestion, setActiveSuggestion] = useState(0); // Track active suggestion for keyboard navigation
  const [searchTerm, setSearchTerm] = useState(""); // Separate search term
  const [isCreateSectionExpanded, setIsCreateSectionExpanded] = useState(false); // Track if create section is expanded
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Track edit modal visibility
  const [editingFoodItem, setEditingFoodItem] = useState(null); // Store the food item being edited
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false); // Track success overlay visibility
  const [createdFoodItemName, setCreatedFoodItemName] = useState(""); // Store created food item name
  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "error",
  });

  const navigate = useNavigate();

  // Handle clicking outside the food suggestions dropdown to close it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showFoodSuggestions) {
        const searchContainer = document.querySelector(
          ".food-search-input-container"
        );
        if (searchContainer && !searchContainer.contains(e.target)) {
          setShowFoodSuggestions(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showFoodSuggestions]);

  // Handle keyboard navigation like restaurant search
  const handleKeyDown = (e) => {
    if (!showFoodSuggestions || foodSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev + 1) % foodSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion(
        (prev) => (prev - 1 + foodSuggestions.length) % foodSuggestions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (foodSuggestions.length > 0) {
        const selectedFood = foodSuggestions[activeSuggestion];
        handleSelectExistingFoodItem(selectedFood);
      }
    } else if (e.key === "Escape") {
      setShowFoodSuggestions(false);
    }
  };

  // Handle food item search and show suggestions
  const handleFoodItemSearch = (event) => {
    const searchValue = event.target.value;
    setSearchTerm(searchValue); // Update search term, NOT foodItem.name

    let filteredItems;
    if (searchValue.trim() === "") {
      // Show first 10 food items when input is empty
      filteredItems = existingFoodItems.slice(0, 10);
    } else {
      // Filter food items based on search term
      filteredItems = existingFoodItems.filter((item) =>
        item.name.toLowerCase().includes(searchValue.toLowerCase())
      );
      // If there are many results, limit to first 20, otherwise show all
      filteredItems =
        filteredItems.length > 20 ? filteredItems.slice(0, 20) : filteredItems;
    }

    setFoodSuggestions(filteredItems);
    setShowFoodSuggestions(true);
    setActiveSuggestion(0);
  };

  // Handle input focus to show all food items
  const handleFoodItemFocus = () => {
    setShowFoodSuggestions(true);

    let itemsToShow;
    if (searchTerm.trim() === "") {
      // Show first 10 food items when input is empty
      itemsToShow = existingFoodItems.slice(0, 10);
    } else {
      // Filter food items based on current search term
      const filteredItems = existingFoodItems.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      // If there are many results, limit to first 20, otherwise show all
      itemsToShow =
        filteredItems.length > 20 ? filteredItems.slice(0, 20) : filteredItems;
    }

    setFoodSuggestions(itemsToShow);
    setActiveSuggestion(0);
  };

  // Add an existing food item directly to the review (already has _id)
  const handleSelectExistingFoodItem = (item) => {
    console.log("Adding existing food item:", item);

    const updatedFoodItems = [...foodItems, item]; // Add existing item with _id
    setFoodItems(updatedFoodItems);
    onFoodItemsUpdated(updatedFoodItems);

    // Reset form
    setFoodItem({
      name: "",
      category: "",
      type: "",
      subType: "",
      size: "",
      price: "",
      tags: [],
    });
    setSearchTerm(""); // Clear the search
    setShowFoodSuggestions(false);
  };

  // Autofill the form when a food item is selected (for editing/creating new)
  const handleSelectFoodItem = (item) => {
    setFoodItem({
      name: item.name,
      category: item.category,
      type: item.type || item.category,
      subType: item.subType || "",
      size: item.sizeOptions || "",
      price: item.price,
      tags: Array.isArray(item.tags) ? item.tags : [],
    });
    setShowFoodSuggestions(false);
  };

  // Handle dropdown changes for standardized fields
  const handleDropdownChange = (field, value) => {
    setFoodItem({ ...foodItem, [field]: value });

    // Auto-clear dependent fields when category changes
    if (field === "category") {
      setFoodItem((prev) => ({
        ...prev,
        category: value,
        type: "",
        subType: "",
      }));
    } else if (field === "type") {
      setFoodItem((prev) => ({
        ...prev,
        type: value,
        subType: "",
      }));
    }
  };

  // Create a new food item in the database
  const handleAddFoodItem = async () => {
    if (!foodItem.name || !foodItem.category || !foodItem.type) {
      setNotification({
        isVisible: true,
        message: "Food name, category, and type are required.",
        type: "error",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setNotification({
          isVisible: true,
          message: "You must be logged in to add food items.",
          type: "error",
        });
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      // Create the food item in the database
      const foodItemData = {
        restaurant: restaurantId,
        name: foodItem.name,
        category: foodItem.category,
        type: foodItem.type,
        subType: foodItem.subType || "",
        price: parseFloat(foodItem.price) || 0,
        tags: Array.isArray(foodItem.tags) ? foodItem.tags : [],
        sizeOptions:
          foodItem.size && foodItem.size.trim() !== ""
            ? foodItem.size
            : undefined,
      };

      console.log("Creating new food item:", foodItemData);

      const response = await axios.post("/food-items", foodItemData, config);

      const savedFoodItem = response.data;
      console.log("Food item created successfully:", savedFoodItem);

      const updatedFoodItems = [...foodItems, savedFoodItem]; // Add the saved food item with _id
      setFoodItems(updatedFoodItems);
      onFoodItemsUpdated(updatedFoodItems);

      // Show success overlay
      setCreatedFoodItemName(savedFoodItem.name);
      setShowSuccessOverlay(true);

      // Reset form
      setFoodItem({
        name: "",
        category: "",
        type: "",
        subType: "",
        size: "",
        price: "",
        tags: [],
      });
    } catch (error) {
      console.error("Error creating food item:", error);
      setNotification({
        isVisible: true,
        message: `Error creating food item: ${
          error.response?.data?.message || error.message
        }`,
        type: "error",
      });
    }
  };

  // Handle opening the edit modal
  const handleEditFoodItem = (item, index) => {
    setEditingFoodItem({ ...item, index }); // Store the item with its index
    setIsEditModalOpen(true);
  };

  // Handle when a food item is updated in the modal
  const handleFoodItemUpdated = (updatedFoodItem) => {
    const updatedFoodItems = [...foodItems];
    updatedFoodItems[editingFoodItem.index] = updatedFoodItem;
    setFoodItems(updatedFoodItems);
    onFoodItemsUpdated(updatedFoodItems);
  };

  // Get available types based on selected category
  const getAvailableTypes = () => {
    return foodItem.category ? FOOD_TYPES[foodItem.category] || [] : [];
  };

  // Get available subtypes based on selected type
  const getAvailableSubtypes = () => {
    return foodItem.type ? FOOD_SUBTYPES[foodItem.type] || [] : [];
  };

  return (
    <div className="food-item-form">
      <div className="food-item-form-container">
        <h3 className="form-title">Add Food Items to Review</h3>
        <p className="form-subtitle">
          Search for existing items or create new ones
        </p>

        <div className="food-search-input-container">
          <input
            type="text"
            placeholder="Search for existing food items..."
            className="form-input"
            value={searchTerm}
            onChange={handleFoodItemSearch}
            onKeyDown={handleKeyDown}
            onFocus={handleFoodItemFocus}
            required
          />
          {showFoodSuggestions && foodSuggestions.length > 0 && (
            <ul className="suggestions-dropdown">
              {foodSuggestions.map((item, index) => (
                <li
                  key={item._id}
                  className={`suggestion-item ${
                    index === activeSuggestion ? "active" : ""
                  }`}
                  onClick={() => handleSelectExistingFoodItem(item)}
                >
                  {item.name} - {item.category}
                  {item.subType && ` (${item.subType})`}
                  {item.price != null && item.price > 0 && ` - $${item.price}`}
                  {item.price === 0 && ` - Free`}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Display added food items */}
        <div className="food-items-list">
          <h3>Food Items Added to Review</h3>
          {foodItems.length === 0 ? (
            <p className="no-items-message">No food items added yet.</p>
          ) : (
            <ul>
              {foodItems.map((item, index) => (
                <li key={index}>
                  <div className="food-item-info">
                    <strong>{item.name}</strong> - {item.category} (
                    {item.subType || "No subtype"}), ${item.price}
                    {item._id && (
                      <span className="saved-indicator">✓ Saved</span>
                    )}
                  </div>
                  <div className="food-item-actions">
                    <button
                      onClick={() => handleEditFoodItem(item, index)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const updatedItems = foodItems.filter(
                          (_, i) => i !== index
                        );
                        setFoodItems(updatedItems);
                        onFoodItemsUpdated(updatedItems);
                      }}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="create-food-section">
          <div
            className="section-header"
            onClick={() => setIsCreateSectionExpanded(!isCreateSectionExpanded)}
          >
            <h4 className="section-title">Create New Food Item</h4>
            <span
              className={`collapse-icon ${
                isCreateSectionExpanded ? "expanded" : ""
              }`}
            >
              ▼
            </span>
          </div>

          <div
            className={`section-content ${
              isCreateSectionExpanded ? "expanded" : "collapsed"
            }`}
          >
            <p className="section-subtitle">
              Fill out all fields below to create a new food item
            </p>

            <div className="form-group">
              <label className="form-label">Food Name *</label>
              <input
                type="text"
                placeholder="e.g., Birria Tacos, Cheeseburger, Margherita Pizza"
                value={foodItem.name}
                onChange={(e) =>
                  setFoodItem({ ...foodItem, name: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            <StandardizedDropdown
              label="Category"
              placeholder="Select food category"
              options={FOOD_CATEGORIES}
              value={foodItem.category}
              onChange={(value) => handleDropdownChange("category", value)}
              required={true}
            />

            <StandardizedDropdown
              label="Type"
              placeholder={
                foodItem.category ? "Select food type" : "Select category first"
              }
              options={getAvailableTypes()}
              value={foodItem.type}
              onChange={(value) => handleDropdownChange("type", value)}
              disabled={!foodItem.category}
              required={true}
            />

            <StandardizedDropdown
              label="Sub-type (Optional)"
              placeholder={
                foodItem.type ? "Select sub-type" : "Select type first"
              }
              options={getAvailableSubtypes()}
              value={foodItem.subType}
              onChange={(value) => handleDropdownChange("subType", value)}
              disabled={!foodItem.type}
            />

            <StandardizedDropdown
              label="Size (Optional)"
              placeholder="Select size"
              options={SIZE_OPTIONS}
              value={foodItem.size}
              onChange={(value) => handleDropdownChange("size", value)}
            />

            <div className="form-group">
              <label className="form-label">Price (Optional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 6.99"
                value={foodItem.price}
                onChange={(e) =>
                  setFoodItem({ ...foodItem, price: e.target.value })
                }
                className="form-input"
              />
            </div>

            <StandardizedDropdown
              label="Tags (Optional)"
              placeholder="Select dietary tags"
              options={DIETARY_TAGS}
              value={foodItem.tags}
              onChange={(value) => handleDropdownChange("tags", value)}
              allowMultiple={true}
            />

            <button onClick={handleAddFoodItem} className="add-food-item-btn">
              Create & Add New Food Item
            </button>
          </div>
        </div>
      </div>

      {/* Error Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />

      {/* Edit Food Item Modal */}
      <EditFoodItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        foodItem={editingFoodItem}
        onFoodItemUpdated={handleFoodItemUpdated}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccessOverlay}
        onClose={() => setShowSuccessOverlay(false)}
        title="Food Item Created Successfully!"
        message={`"${createdFoodItemName}" has been added to your review`}
        subtitle="You can now rate this item and continue with your review"
        icon="🍽️"
      />
    </div>
  );
}

export default FoodItemForm;
