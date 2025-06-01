import React, { useState } from "react";
import CitySearch from "../components/CitySearch";
import FoodItemForm from "../components/FoodItemForm";
import RatingScale from "../components/RatingScale";
import axios from "axios";
import "../styles/ReviewSubmissionPage.css";
import { useNavigate, useLocation } from "react-router-dom";

function ReviewSubmissionPage() {
  const location = useLocation();
  const [step, setStep] = useState(location.state?.step || 1); // Retain the current step
  const [formData, setFormData] = useState({
    location: location.state?.formData?.location || {
      city: "",
      province: "",
      country: "",
    },
    restaurant: "",
    foodItems: [],
    ratings: [],
    photos: [],
    purchaseDate: "",
  });
  const [errors, setErrors] = useState({});
  const [restaurantSuggestions, setRestaurantSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  // Validate Step 1
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.location.city) newErrors.city = "City is required";
    if (!formData.location.province)
      newErrors.province = "Province is required";
    if (!formData.location.country) newErrors.country = "Country is required";
    return newErrors;
  };

  // Proceed to the next step
  const handleNext = async () => {
    if (step === 1) {
      const validationErrors = validateStep1();
      if (Object.keys(validationErrors).length === 0) {
        console.log("Step 1 Data: ", formData);
        setStep(step + 1); // Move to Step 2
      } else {
        setErrors(validationErrors); // Display validation errors if any
      }
    } else if (step === 2) {
      console.log(`Step ${step} Data: `, formData);

      // Check if restaurantId exists before pre-fetching food items
      if (formData.restaurantId) {
        try {
          // Pre-fetch all food items for the selected restaurant
          const response = await axios.get(
            `http://localhost:5000/api/food-items/restaurant/${formData.restaurantId}`
          );

          // Store the fetched food items in the formData
          setFormData((prevData) => ({
            ...prevData,
            foodItems: response.data, // Store all food items fetched from the API
          }));

          // Move to Step 3
          setStep(step + 1);
        } catch (error) {
          console.error("Error fetching food items for the restaurant:", error);
        }
      } else {
        console.error("Restaurant ID not found. Please select a restaurant.");
      }
    } else {
      // For steps beyond Step 2, continue with form submission or next steps
      console.log(`Step ${step} Data: `, formData);
      setStep(step + 1);
    }
  };

  // Go to the previous step
  const handlePrevious = () => {
    setStep(step - 1);
  };

  // Update form data as each step progresses
  const handleUpdate = (newData) => {
    setFormData((prevData) => ({
      ...prevData,
      ...newData,
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setActiveSuggestion((prev) => (prev + 1) % restaurantSuggestions.length);
    } else if (e.key === "ArrowUp") {
      setActiveSuggestion(
        (prev) =>
          (prev - 1 + restaurantSuggestions.length) %
          restaurantSuggestions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (restaurantSuggestions.length > 0) {
        const selectedRestaurant = restaurantSuggestions[activeSuggestion];
        setFormData({
          ...formData,
          restaurant: selectedRestaurant.name,
        });
        setShowSuggestions(false); // Hide dropdown after selection
      }
    }
  };

  // Function to handle searching restaurants
  const handleRestaurantSearch = async (e) => {
    const searchTerm = e.target.value;
    setFormData({ ...formData, restaurant: searchTerm });
    setShowSuggestions(true);
    if (
      formData.location.city &&
      formData.location.province &&
      formData.location.country
    ) {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/restaurants/search`,
          {
            params: {
              city: formData.location.city,
              province: formData.location.province,
              country: formData.location.country,
            },
          }
        );

        const filteredRestaurants = response.data.filter((restaurant) =>
          restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setRestaurantSuggestions(filteredRestaurants);
      } catch (error) {
        console.error("Error searching restaurants:", error);
      }
    }
  };

  // Submit the entire form at the end
  const handleSubmit = async () => {
    try {
      await axios.post("/api/reviews", formData);
      alert("Review submitted successfully!");
      navigate("/home");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Error submitting review.");
    }
  };

  return (
    <div className="review-form-container">
      {/* Step 1: Select Location */}
      {step === 1 && (
        <div className="review-step">
          <h2>Select Location</h2>
          <CitySearch
            onSelectCity={(selectedCity) =>
              setFormData({
                ...formData,
                location: {
                  city: selectedCity.city,
                  province: selectedCity.province,
                  country: selectedCity.country,
                },
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // Prevent unintended navigation or submission
                handleNext();
              }
            }}
          />
          <input
            type="text"
            placeholder="City"
            value={formData.location.city}
            className="review-input"
            readOnly
          />
          {errors.city && <span className="error-text">{errors.city}</span>}
          <input
            type="text"
            placeholder="Province"
            value={formData.location.province}
            className="review-input"
            readOnly
          />
          {errors.province && (
            <span className="error-text">{errors.province}</span>
          )}
          <input
            type="text"
            placeholder="Country"
            value={formData.location.country}
            className="review-input"
            readOnly
          />
          {errors.country && (
            <span className="error-text">{errors.country}</span>
          )}
          <div className="step-nav-buttons">
            <button onClick={handleNext} className="step-button">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Restaurant */}
      {step === 2 && (
        <div className="review-step">
          <h2>
            Select Restaurant for {formData.location.city},{" "}
            {formData.location.province}, {formData.location.country}
          </h2>
          <form onSubmit={(e) => e.preventDefault()} className="search-form">
            <input
              type="text"
              placeholder="Search Restaurant"
              className="search-input"
              value={formData.restaurant}
              onChange={handleRestaurantSearch}
              onKeyDown={handleKeyDown}
            />
            {showSuggestions && restaurantSuggestions.length > 0 && (
              <ul className="suggestions-list">
                {restaurantSuggestions.map((restaurant, index) => (
                  <li
                    key={restaurant._id}
                    className={
                      index === activeSuggestion ? "active-suggestion" : ""
                    }
                    onClick={() => {
                      setFormData({
                        ...formData,
                        restaurant: restaurant.name,
                        restaurantId: restaurant._id,
                        address: restaurant.address.street,
                      });
                      setShowSuggestions(false); // Hide suggestions after selection
                    }}
                  >
                    {restaurant.name} - {restaurant.address.street}
                  </li>
                ))}
                <li
                  className="add-restaurant-option"
                  onClick={() =>
                    navigate("/add-restaurant", {
                      state: { formData, step: 2 },
                    })
                  }
                >
                  + Add a new restaurant
                </li>
              </ul>
            )}

            <div className="step-nav-buttons">
              <button onClick={handlePrevious} className="step-button">
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="step-button"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Add Food Items */}
      {step === 3 && (
        <div>
          <h2>Add Food Items</h2>
          <FoodItemForm
            restaurantId={formData.restaurantId} // Pass the restaurant ID
            onFoodItemsUpdated={(foodItems) => handleUpdate({ foodItems })} // Update food items in formData
          />
          <button onClick={handlePrevious}>Previous</button>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {/* Step 4: Add Ratings */}
      {step === 4 && (
        <div>
          <h2>Rate Food Items</h2>
          {formData.foodItems.map((foodItem, index) => (
            <div key={index}>
              <h3>{foodItem.name}</h3>
              <RatingScale
                onRatingChange={(rating) => {
                  const updatedRatings = [...formData.ratings];
                  updatedRatings[index] = rating;
                  handleUpdate({ ratings: updatedRatings });
                }}
              />
            </div>
          ))}
          <button onClick={handlePrevious}>Previous</button>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {/* Step 5: Add Photos */}
      {step === 5 && (
        <div>
          <h2>Upload Photos</h2>
          <input
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files);
              handleUpdate({ photos: files });
            }}
          />
          <button onClick={handlePrevious}>Previous</button>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {/* Step 6: Confirm Review */}
      {step === 6 && (
        <div className="step-summary">
          <h2>Review Your Submission</h2>
          <div className="summary-item">
            <strong>Location:</strong>{" "}
            {`${formData.location.city}, ${formData.location.province}, ${formData.location.country}`}
          </div>
          <div className="summary-item">
            <strong>Restaurant:</strong> {formData.restaurant}
          </div>
          <div className="summary-item">
            <strong>Food Items:</strong>
            <ul>
              {formData.foodItems.map((item, index) => (
                <li key={index}>
                  {item.name} - {item.category} ({item.subCategory}), Price: $
                  {item.price}
                </li>
              ))}
            </ul>
          </div>
          <div className="summary-item">
            <strong>Ratings:</strong>
            <ul>
              {formData.ratings.map((rating, index) => (
                <li key={index}>
                  Item {index + 1}: {rating}
                </li>
              ))}
            </ul>
          </div>
          <div className="summary-item">
            <strong>Purchase Date:</strong>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) =>
                setFormData({ ...formData, purchaseDate: e.target.value })
              }
            />
          </div>
          <button onClick={handlePrevious}>Previous</button>
          <button onClick={handleSubmit}>Submit Review</button>
        </div>
      )}
    </div>
  );
}

export default ReviewSubmissionPage;
