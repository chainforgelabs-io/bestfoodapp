import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/RestaurantPage.css";
import axios from "axios";

function RestaurantPage() {
  const { restaurantID } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // To handle navigation back or other actions

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);

        // Fetch restaurant details
        const restaurantResponse = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/${restaurantID}`
        );
        setRestaurant(restaurantResponse.data);

        // Fetch food items for this restaurant
        const foodItemsResponse = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/food-items/restaurant/${restaurantID}`
        );
        console.log(foodItemsResponse.data);
        setFoodItems(foodItemsResponse.data);
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [restaurantID]);

  if (loading) {
    return (
      <div className="restaurant-page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="restaurant-page-container">
        <h1 className="restaurant-page-title">Restaurant Not Found</h1>
        <p>Sorry, we couldn't find the restaurant you're looking for.</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Back to Previous Page
        </button>
      </div>
    );
  }

  return (
    <div className="restaurant-page-container">
      {/* Restaurant Header */}
      <div className="restaurant-header">
        <h1 className="restaurant-page-title">{restaurant.name}</h1>
        <div className="restaurant-info">
          {restaurant.type && (
            <span className="restaurant-type">{restaurant.type}</span>
          )}
          {restaurant.cuisine && restaurant.cuisine.length > 0 && (
            <div className="cuisine-tags">
              {restaurant.cuisine.map((c, index) => (
                <span key={index} className="cuisine-tag">
                  {c}
                </span>
              ))}
            </div>
          )}
          {restaurant.address && (
            <p className="restaurant-address">
              📍 {restaurant.address.street && `${restaurant.address.street}, `}
              {restaurant.address.city}, {restaurant.address.province}
            </p>
          )}
        </div>
      </div>

      {/* Food Items Section */}
      <div className="food-items-section">
        <h2 className="section-title">Menu Items ({foodItems.length})</h2>

        {foodItems.length > 0 ? (
          <div className="results-section">
            {foodItems.map((item, index) => (
              <div key={item._id} className="result-item">
                <h3>
                  {index + 1}. {item.name || "Unnamed Food Item"}
                </h3>
                <p>Category: {item.category || "Unknown Category"}</p>
                <p>Type: {item.type || "Unknown Type"}</p>
                <p>Price: {item.price ? `$${item.price}` : "Unknown Price"}</p>
                <div className="scores">
                  <p>Admin Score: {item.adminScore || 0}</p>
                  <p>Community Score: {item.communityScore || 0}</p>
                  <p>Overall Score: {item.overallAverageScore || 0}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-items">
            <p>No food items found for this restaurant.</p>
          </div>
        )}
      </div>

      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="back-button">
        Back to Previous Page
      </button>
    </div>
  );
}

export default RestaurantPage;
