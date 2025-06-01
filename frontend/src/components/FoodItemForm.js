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
    subCategory: "",
    size: "",
    price: "",
    tags: "",
  });

  const [foodItems, setFoodItems] = useState([]); // Store added food items
  const [foodSuggestions, setFoodSuggestions] = useState([]); // Store suggestions from search
  const [showFoodSuggestions, setShowFoodSuggestions] = useState(false); // Control dropdown

  const navigate = useNavigate();

  // Handle food item search and show suggestions
  const handleFoodItemSearch = (event) => {
    const searchTerm = event.target.value;

    // Update the food item name
    setFoodItem({ ...foodItem, name: searchTerm });

    if (searchTerm.length > 0) {
      // Filter existing food items from the restaurant based on search term
      const filteredItems = existingFoodItems.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFoodSuggestions(filteredItems);
      setShowFoodSuggestions(true);
    } else {
      setShowFoodSuggestions(false);
      setFoodSuggestions([]);
    }
  };

  // Autofill the form when a food item is selected
  const handleSelectFoodItem = (item) => {
    setFoodItem({
      name: item.name,
      category: item.category,
      subCategory: item.subCategory || "", // Optional subCategory
      size: "", // Optional size remains blank
      price: item.price, // Preload price
      tags: item.tags || "", // Optional tags
    });
    setShowFoodSuggestions(false); // Hide suggestions after selection
  };

  const handleAddFoodItem = () => {
    if (!foodItem.name || !foodItem.category) {
      alert("Food name and category are required.");
      return;
    }
    const updatedFoodItems = [...foodItems, foodItem]; // Add new food item to the list
    setFoodItems(updatedFoodItems);
    onFoodItemsUpdated(updatedFoodItems); // Pass the updated list to the parent component
    setFoodItem({
      name: "",
      category: "",
      subCategory: "",
      size: "",
      price: "",
      tags: "",
    }); // Reset form for new entries
  };

  return (
    <div>
      <h3>Add Food Items</h3>
      <input
        type="text"
        placeholder="Food Name"
        value={foodItem.name}
        onChange={handleFoodItemSearch} // Search functionality
        required
      />
      {showFoodSuggestions && foodSuggestions.length > 0 && (
        <ul className="suggestions-list">
          {foodSuggestions.map((item) => (
            <li key={item._id} onClick={() => handleSelectFoodItem(item)}>
              {item.name} - {item.category} ({item.subCategory}), ${item.price}
            </li>
          ))}
          <li
            className="add-food-item-option"
            onClick={() =>
              navigate("/add-food-item", { state: { restaurantId } })
            }
          >
            + Add a new food item
          </li>
        </ul>
      )}
      <input
        type="text"
        placeholder="Category"
        value={foodItem.category}
        onChange={(e) => setFoodItem({ ...foodItem, category: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Subcategory"
        value={foodItem.subCategory}
        onChange={(e) =>
          setFoodItem({ ...foodItem, subCategory: e.target.value })
        }
      />
      <input
        type="text"
        placeholder="Size (Optional)"
        value={foodItem.size}
        onChange={(e) => setFoodItem({ ...foodItem, size: e.target.value })}
      />
      <input
        type="number"
        placeholder="Price"
        value={foodItem.price}
        onChange={(e) => setFoodItem({ ...foodItem, price: e.target.value })}
      />
      <input
        type="text"
        placeholder="Tags (comma-separated)"
        value={foodItem.tags}
        onChange={(e) => setFoodItem({ ...foodItem, tags: e.target.value })}
      />
      <button onClick={handleAddFoodItem}>Add Food Item</button>

      {/* Display added food items */}
      <ul>
        {foodItems.map((item, index) => (
          <li key={index}>
            {item.name} - {item.category} (
            {item.subCategory || "No subcategory"}) - {item.size || "No size"} -
            ${item.price}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FoodItemForm;
