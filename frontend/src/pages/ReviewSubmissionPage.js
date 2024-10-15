import React, { useState } from "react";
import CitySearch from "../components/CitySearch";
import FoodItemForm from "../components/FoodItemForm";
import RatingScale from "../components/RatingScale";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function ReviewSubmissionPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    location: null,
    restaurant: null,
    foodItems: [],
    ratings: [],
    photos: [],
    purchaseDate: "",
  });

  const navigate = useNavigate();

  // Proceed to the next step
  const handleNext = () => {
    setStep(step + 1);
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
        <div>
          <h2>Select Location</h2>
          <CitySearch onSelectCity={(location) => handleUpdate({ location })} />
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {/* Step 2: Select Restaurant */}
      {step === 2 && (
        <div>
          <h2>Select Restaurant</h2>
          <input
            type="text"
            placeholder="Search Restaurant"
            onChange={(e) => handleUpdate({ restaurant: e.target.value })}
          />
          <button onClick={handleNext}>Next</button>
          <button onClick={handlePrevious}>Previous</button>
        </div>
      )}

      {/* Step 3: Add Food Items */}
      {step === 3 && (
        <div>
          <h2>Add Food Items</h2>
          <FoodItemForm
            onFoodItemsUpdated={(foodItems) => handleUpdate({ foodItems })}
          />
          <button onClick={handleNext}>Next</button>
          <button onClick={handlePrevious}>Previous</button>
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
          <button onClick={handleNext}>Next</button>
          <button onClick={handlePrevious}>Previous</button>
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
          <button onClick={handleNext}>Next</button>
          <button onClick={handlePrevious}>Previous</button>
        </div>
      )}

      {/* Step 6: Confirm Review */}
      {step === 6 && (
        <div>
          <h2>Confirm Review</h2>
          <p>Purchase Date:</p>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleUpdate({ purchaseDate: e.target.value })}
          />
          <button onClick={handleSubmit}>Submit Review</button>
          <button onClick={handlePrevious}>Previous</button>
        </div>
      )}
    </div>
  );
}

export default ReviewSubmissionPage;
