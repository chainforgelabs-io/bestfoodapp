import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/RestaurantPage.css";
import api from "../services/api";

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
        const restaurantResponse = await api.get(
          `/api/restaurants/${restaurantID}`
        );
        setRestaurant(restaurantResponse.data);

        // Fetch food items for this restaurant
        const foodItemsResponse = await api.get(
          `/api/food-items/restaurant/${restaurantID}`
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
            {foodItems
              .sort(
                (a, b) =>
                  (b.overallAverageScore || 0) - (a.overallAverageScore || 0)
              )
              .map((item, index) => (
                <div key={item._id} className="result-item">
                  <div className="result-header">
                    <div className="rank-number">#{index + 1}</div>
                    <h3 className="food-name">
                      {item.name || "Unnamed Food Item"}
                    </h3>
                    <div className="overall-score">
                      {Math.round(item.overallAverageScore || 0)}
                    </div>
                  </div>

                  <div className="result-content">
                    <div className="food-info">
                      <span className="food-label">🍽️ Category:</span>
                      <span className="food-details">
                        {item.category || "Unknown Category"}
                      </span>
                    </div>

                    <div className="food-info">
                      <span className="food-label">🏷️ Type:</span>
                      <span className="food-details">
                        {item.type || "Unknown Type"}
                      </span>
                    </div>

                    {item.price && (
                      <div className="food-info">
                        <span className="food-label">💰 Price:</span>
                        <span className="food-details price">
                          ${item.price}
                        </span>
                      </div>
                    )}

                    <div className="scores-section">
                      <div className="score-item">
                        <span className="score-label">Admin</span>
                        <span className="score-value">
                          {Math.round(item.adminScore || 0)}
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Community</span>
                        <span className="score-value">
                          {Math.round(item.communityScore || 0)}
                        </span>
                      </div>
                    </div>
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
