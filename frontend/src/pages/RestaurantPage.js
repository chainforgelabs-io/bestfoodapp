import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/RestaurantPage.css";
import axios from "axios";

function RestaurantPage() {
  const { restaurantID } = useParams();
  const [foodItems, setFoodItems] = useState([]);
  const navigate = useNavigate(); // To handle navigation back or other actions

  useEffect(() => {
    const fetchRestaurantFoodItems = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/food-items/restaurant/${restaurantID}`
        );
        console.log(response.data);
        setFoodItems(response.data);
      } catch (error) {
        console.error("Error fetching food items for the restaurant:", error);
      }
    };

    fetchRestaurantFoodItems();
  }, [restaurantID]);

  return (
    <div className="restaurant-page-container">
      <h1 className="restaurant-page-title">Food Items for Restaurant</h1>

      {foodItems.length > 0 ? (
        <div className="results-section">
          {foodItems.map((item, index) => (
            <div key={item._id} className="result-item">
              <h3>
                {index + 1}. {item.name || "Unnamed Food Item"}
              </h3>
              <p>Category: {item.category || "Unknown Category"}</p>
              <p>Price: {item.price ? `$${item.price}` : "Unknown Price"}</p>
              <p>Admin Score: {item.adminScore || 0}</p>
              <p>Community Score: {item.communityScore || 0}</p>
              <p>Overall Score: {item.overallAverageScore || 0}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No food items found for this restaurant.</p>
      )}

      {/* A back button to return to the home page */}
      <button onClick={() => navigate("/")} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default RestaurantPage;
