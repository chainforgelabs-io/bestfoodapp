import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
    tags: "",
  });

  const [foodItems, setFoodItems] = useState([]); // Store added food items
  const [foodSuggestions, setFoodSuggestions] = useState([]); // Store suggestions from search
  const [showFoodSuggestions, setShowFoodSuggestions] = useState(false); // Control dropdown
  const [activeSuggestion, setActiveSuggestion] = useState(0); // Track active suggestion for keyboard navigation
  const [searchTerm, setSearchTerm] = useState(""); // Separate search term

  const navigate = useNavigate();

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

    if (searchValue.length > 0) {
      const filteredItems = existingFoodItems.filter((item) =>
        item.name.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFoodSuggestions(filteredItems);
      setShowFoodSuggestions(true);
      setActiveSuggestion(0);
    } else {
      setShowFoodSuggestions(false);
      setFoodSuggestions([]);
    }
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
      tags: "",
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
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "",
    });
    setShowFoodSuggestions(false);
  };

  // Create a new food item in the database
  const handleAddFoodItem = async () => {
    if (!foodItem.name || !foodItem.category || !foodItem.type) {
      alert("Food name, category, and type are required.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("You must be logged in to add food items.");
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
        tags: foodItem.tags
          ? foodItem.tags.split(",").map((tag) => tag.trim())
          : [],
        sizeOptions:
          foodItem.size && foodItem.size.trim() !== ""
            ? foodItem.size
            : undefined,
      };

      console.log("Creating new food item:", foodItemData);

      const response = await axios.post(
        "http://localhost:5000/api/food-items",
        foodItemData,
        config
      );

      const savedFoodItem = response.data;
      console.log("Food item created successfully:", savedFoodItem);

      const updatedFoodItems = [...foodItems, savedFoodItem]; // Add the saved food item with _id
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
        tags: "",
      });
    } catch (error) {
      console.error("Error creating food item:", error);
      alert(
        `Error creating food item: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  return (
    <div className="food-item-form">
      <div className="food-item-form-container">
        <h3 className="form-title">Add Food Items to Review</h3>
        <p className="form-subtitle">
          Search for existing items or create new ones
        </p>

        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Search for existing food items..."
            className="form-input"
            value={searchTerm}
            onChange={handleFoodItemSearch}
            onKeyDown={handleKeyDown}
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
                  {item.price && ` - $${item.price}`}
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="create-food-section">
          <h4 className="section-title">Create New Food Item</h4>
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

          <div className="form-group">
            <label className="form-label">Category *</label>
            <input
              type="text"
              placeholder="e.g., Mains, Appetizers, Sides, Desserts"
              value={foodItem.category}
              onChange={(e) =>
                setFoodItem({ ...foodItem, category: e.target.value })
              }
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type *</label>
            <input
              type="text"
              placeholder="e.g., Tacos, Burger, Pizza, Pasta, Sandwich"
              value={foodItem.type}
              onChange={(e) =>
                setFoodItem({ ...foodItem, type: e.target.value })
              }
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sub-type (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Cheese Burger, Veggie Pizza, Beef Tacos"
              value={foodItem.subType}
              onChange={(e) =>
                setFoodItem({ ...foodItem, subType: e.target.value })
              }
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Size (Optional)</label>
            <input
              type="text"
              placeholder="e.g., small, medium, large, extra large"
              value={foodItem.size}
              onChange={(e) =>
                setFoodItem({ ...foodItem, size: e.target.value })
              }
              className="form-input"
            />
          </div>

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

          <div className="form-group">
            <label className="form-label">Tags (Optional)</label>
            <input
              type="text"
              placeholder="e.g., spicy, vegan, gluten-free (comma-separated)"
              value={foodItem.tags}
              onChange={(e) =>
                setFoodItem({ ...foodItem, tags: e.target.value })
              }
              className="form-input"
            />
          </div>

          <button onClick={handleAddFoodItem} className="add-food-item-btn">
            Create & Add New Food Item
          </button>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoodItemForm;
