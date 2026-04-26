import React, { useState, useEffect } from "react";
import CitySearch from "../components/CitySearch";
import FoodItemForm from "../components/FoodItemForm";
import RatingScale from "../components/RatingScale";
import RestaurantModal from "../components/RestaurantModal";
import Notification from "../components/Notification";
import SuccessOverlay from "../components/SuccessOverlay";
import axios from "../api/axios";
import "../styles/ReviewSubmissionPage.css";
import { useNavigate, useLocation } from "react-router-dom";
import SEO from "../components/SEO";

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
    receiptId:
      location.state?.receiptId ||
      location.state?.formData?.receiptId ||
      "",
    receiptThumbUrl:
      location.state?.receiptThumbUrl ||
      location.state?.formData?.receiptThumbUrl ||
      null,
  });
  const [receiptDisplayUrl, setReceiptDisplayUrl] = useState(
    location.state?.receiptThumbUrl ||
      location.state?.formData?.receiptThumbUrl ||
      null
  );
  const [existingFoodItems, setExistingFoodItems] = useState([]); // Separate state for all existing food items for search
  const [errors, setErrors] = useState({});
  const [restaurantSuggestions, setRestaurantSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [addedRestaurantName, setAddedRestaurantName] = useState("");
  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "error",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]); // [{url, key}]

  // Load signed receipt preview if we have receiptId but no blob URL (e.g. refresh)
  useEffect(() => {
    const id = formData.receiptId;
    if (!id || receiptDisplayUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`/receipts/${id}/image`);
        if (!cancelled && data?.url) {
          setReceiptDisplayUrl(data.url);
        }
      } catch (e) {
        console.warn("Receipt preview unavailable", e?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.receiptId, receiptDisplayUrl]);

  // Handle clicking outside the suggestions dropdown to close it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showSuggestions) {
        const searchContainer = document.querySelector(
          ".search-input-container"
        );
        if (searchContainer && !searchContainer.contains(e.target)) {
          setShowSuggestions(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showSuggestions]);

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
            `/food-items/restaurant/${formData.restaurantId}`
          );

          // Store the fetched food items in existingFoodItems for search, keep formData.foodItems empty for selected items
          setExistingFoodItems(response.data);

          // Move to Step 3
          setStep(step + 1);
        } catch (error) {
          console.error("Error fetching food items for the restaurant:", error);

          // If 404 (no food items found), continue with empty array
          if (error.response?.status === 404) {
            console.log(
              "No food items found for this restaurant - proceeding with empty list"
            );
            setExistingFoodItems([]); // Start with empty array for new restaurants
            setFormData((prevData) => ({
              ...prevData,
              foodItems: [], // Start with empty array for new restaurants
            }));
            setStep(step + 1);
          } else {
            // For other errors, show an error message
            setNotification({
              isVisible: true,
              message: "Error loading restaurant data. Please try again.",
              type: "error",
            });
          }
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
        const response = await axios.get(`/restaurants/search`, {
          params: {
            city: formData.location.city,
            province: formData.location.province,
            country: formData.location.country,
          },
        });

        let filteredRestaurants;
        if (searchTerm.trim() === "") {
          // Show first 10 restaurants when input is empty
          filteredRestaurants = response.data.slice(0, 10);
        } else {
          // Filter restaurants based on search term
          filteredRestaurants = response.data.filter((restaurant) =>
            restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setRestaurantSuggestions(filteredRestaurants);
      } catch (error) {
        console.error("Error searching restaurants:", error);
      }
    }
  };

  // Handle input focus to show all restaurants
  const handleRestaurantFocus = async () => {
    setShowSuggestions(true);

    // Load all restaurants when input is focused
    if (
      formData.location.city &&
      formData.location.province &&
      formData.location.country
    ) {
      try {
        const response = await axios.get(`/restaurants/search`, {
          params: {
            city: formData.location.city,
            province: formData.location.province,
            country: formData.location.country,
          },
        });

        let restaurantsToShow;
        if (formData.restaurant.trim() === "") {
          // Show first 10 restaurants when input is empty
          restaurantsToShow = response.data.slice(0, 10);
        } else {
          // Filter restaurants based on current input value but show all matching
          const filteredRestaurants = response.data.filter((restaurant) =>
            restaurant.name
              .toLowerCase()
              .includes(formData.restaurant.toLowerCase())
          );
          // If there are many results, limit to first 20, otherwise show all
          restaurantsToShow =
            filteredRestaurants.length > 20
              ? filteredRestaurants.slice(0, 20)
              : filteredRestaurants;
        }

        setRestaurantSuggestions(restaurantsToShow);
      } catch (error) {
        console.error("Error loading restaurants:", error);
      }
    }
  };

  // Handle when a restaurant is added via modal
  const handleRestaurantAdded = async (newRestaurant) => {
    // Show success overlay
    setAddedRestaurantName(newRestaurant.name);
    setShowSuccessOverlay(true);

    // Refresh the restaurant search to include the new restaurant
    if (formData.restaurant) {
      try {
        const response = await axios.get(`/restaurants/search`, {
          params: {
            city: formData.location.city,
            province: formData.location.province,
            country: formData.location.country,
          },
        });

        const filteredRestaurants = response.data.filter((restaurant) =>
          restaurant.name
            .toLowerCase()
            .includes(formData.restaurant.toLowerCase())
        );

        setRestaurantSuggestions(filteredRestaurants);
      } catch (error) {
        console.error("Error refreshing restaurants:", error);
      }
    }
  };

  const requestPresignedUrls = async (files) => {
    const token = localStorage.getItem("token");
    const body = {
      files: files.map((f) => ({ fileName: f.name, contentType: f.type })),
      prefix: "reviews",
    };
    const { data } = await axios.post(`/uploads/photos/presign`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.uploads; // [{key,url,uploadUrl,contentType}]
  };

  const uploadToS3 = async (presigned, file) => {
    await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": presigned.contentType,
        "x-amz-acl": "public-read",
      },
      body: file,
    });
    return { url: presigned.url, key: presigned.key };
  };

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleUploadPhotos = async () => {
    if (!selectedFiles.length) return;
    try {
      setUploading(true);
      const presigned = await requestPresignedUrls(selectedFiles);
      const results = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const res = await uploadToS3(presigned[i], selectedFiles[i]);
        results.push(res);
      }
      setUploadedPhotos((prev) => [...prev, ...results]);
      setNotification({
        isVisible: true,
        message: "Photos uploaded",
        type: "success",
      });
    } catch (err) {
      console.error("Photo upload failed", err);
      setNotification({
        isVisible: true,
        message: "Photo upload failed",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  // Submit the entire form at the end
  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setNotification({
          isVisible: true,
          message: "You must be logged in to submit a review.",
          type: "error",
        });
        navigate("/login");
        return;
      }

      // Validate required data
      if (!formData.restaurantId) {
        setNotification({
          isVisible: true,
          message: "Restaurant is required.",
          type: "error",
        });
        return;
      }

      if (!formData.purchaseDate) {
        setNotification({
          isVisible: true,
          message: "Purchase date is required.",
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

      // Format purchase date to MM-DD-YYYY as required by backend
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
      };

      const formattedPurchaseDate = formatDate(formData.purchaseDate);

      console.log("DEBUG: formData.foodItems:", formData.foodItems);

      const reviewPromises = formData.foodItems.map(async (foodItem, index) => {
        console.log("DEBUG: Processing foodItem:", foodItem);

        const rating = formData.ratings[index];

        if (!rating) {
          throw new Error(`Rating is required for ${foodItem.name}`);
        }

        if (!foodItem._id) {
          throw new Error(
            `Food item "${foodItem.name}" does not have an ID. It may not have been saved to the database.`
          );
        }

        const reviewData = {
          restaurantId: formData.restaurantId,
          foodItem: foodItem._id,
          score: parseInt(rating),
          comment: "",
          photos: uploadedPhotos.map((p) => p.url),
          tags: formData.tags || [],
          purchaseDate: formattedPurchaseDate,
        };
        if (formData.receiptId) {
          reviewData.receiptId = formData.receiptId;
        }

        console.log("Sending review data:", reviewData);

        return axios.post(`/reviews`, reviewData, config);
      });

      const results = await Promise.all(reviewPromises);
      console.log("All reviews submitted:", results); // Debug log

      if (formData.receiptId) {
        try {
          await axios.patch(
            `/receipts/${formData.receiptId}`,
            {
              restaurantId: formData.restaurantId,
              status: "confirmed",
            },
            config
          );
        } catch (patchErr) {
          console.warn("Receipt confirmation failed (reviews were saved)", patchErr);
        }
      }

      navigate("/review-success");
    } catch (error) {
      console.error("Error submitting review:", error);
      console.error("Error response:", error.response?.data); // More detailed error

      if (error.response?.status === 401) {
        setNotification({
          isVisible: true,
          message: "You must be logged in to submit a review.",
          type: "error",
        });
        navigate("/login");
      } else if (error.response?.status === 400) {
        setNotification({
          isVisible: true,
          message: `Bad request: ${
            error.response?.data?.message || "Please check your data"
          }`,
          type: "error",
        });
      } else if (error.message.includes("Rating is required")) {
        setNotification({
          isVisible: true,
          message: error.message,
          type: "error",
        });
      } else {
        setNotification({
          isVisible: true,
          message: "Error submitting review. Please try again.",
          type: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="submission-container">
      <SEO
        title="Submit a Review | Best Food App"
        description="Share your dining experience and rate food items."
        noindex={true}
      />
      <div className="form-section">
        <div className="form-header">
          <h1 className="form-heading">Submit Your Review</h1>
          <p className="form-subtitle">
            Share your dining experience with the community
          </p>

          <div className="step-indicator">
            <div
              className={`step ${step >= 1 ? "active" : ""} ${
                step > 1 ? "completed" : ""
              }`}
            >
              <span className="step-number">1</span>
              <span>Location</span>
            </div>
            <div
              className={`step ${step >= 2 ? "active" : ""} ${
                step > 2 ? "completed" : ""
              }`}
            >
              <span className="step-number">2</span>
              <span>Restaurant</span>
            </div>
            <div
              className={`step ${step >= 3 ? "active" : ""} ${
                step > 3 ? "completed" : ""
              }`}
            >
              <span className="step-number">3</span>
              <span>Food Items</span>
            </div>
            <div
              className={`step ${step >= 4 ? "active" : ""} ${
                step > 4 ? "completed" : ""
              }`}
            >
              <span className="step-number">4</span>
              <span>Ratings</span>
            </div>
            <div
              className={`step ${step >= 5 ? "active" : ""} ${
                step > 5 ? "completed" : ""
              }`}
            >
              <span className="step-number">5</span>
              <span>Photos</span>
            </div>
            <div className={`step ${step >= 6 ? "active" : ""}`}>
              <span className="step-number">6</span>
              <span>Review</span>
            </div>
          </div>

          {/* Mobile step indicator */}
          <div className="mobile-step-indicator">
            <div className="mobile-step-track">
              <div
                className={`mobile-step-number ${
                  step >= 1 ? (step > 1 ? "completed" : "active") : ""
                }`}
              >
                1
              </div>
              <div
                className={`mobile-step-divider ${step > 1 ? "completed" : ""}`}
              ></div>
              <div
                className={`mobile-step-number ${
                  step >= 2 ? (step > 2 ? "completed" : "active") : ""
                }`}
              >
                2
              </div>
              <div
                className={`mobile-step-divider ${step > 2 ? "completed" : ""}`}
              ></div>
              <div
                className={`mobile-step-number ${
                  step >= 3 ? (step > 3 ? "completed" : "active") : ""
                }`}
              >
                3
              </div>
              <div
                className={`mobile-step-divider ${step > 3 ? "completed" : ""}`}
              ></div>
              <div
                className={`mobile-step-number ${
                  step >= 4 ? (step > 4 ? "completed" : "active") : ""
                }`}
              >
                4
              </div>
              <div
                className={`mobile-step-divider ${step > 4 ? "completed" : ""}`}
              ></div>
              <div
                className={`mobile-step-number ${
                  step >= 5 ? (step > 5 ? "completed" : "active") : ""
                }`}
              >
                5
              </div>
              <div
                className={`mobile-step-divider ${step > 5 ? "completed" : ""}`}
              ></div>
              <div
                className={`mobile-step-number ${step >= 6 ? "active" : ""}`}
              >
                6
              </div>
            </div>
            <div className="mobile-step-text">
              Step {step} of 6:{" "}
              {step === 1
                ? "Location"
                : step === 2
                ? "Restaurant"
                : step === 3
                ? "Food Items"
                : step === 4
                ? "Ratings"
                : step === 5
                ? "Photos"
                : "Review"}
            </div>
          </div>
        </div>

        <div className="form-content">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(step / 6) * 100}%` }}
            ></div>
          </div>

          {formData.receiptId && (
            <div
              className="receipt-wizard-pill"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                marginBottom: 16,
                borderRadius: 10,
                border: "1px solid #d4c4e8",
                background: "linear-gradient(135deg, #faf7ff 0%, #f3edfa 100%)",
              }}
            >
              {receiptDisplayUrl && (
                <img
                  src={receiptDisplayUrl}
                  alt=""
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #e0e0e0",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ fontSize: 13, lineHeight: 1.4, color: "#444" }}>
                <strong style={{ display: "block", marginBottom: 4 }}>
                  Receipt attached
                </strong>
                Stored privately for your records — not shown on your public
                review.
              </div>
            </div>
          )}

          {/* Step 1: Select Location */}
          {step === 1 && (
            <div className="form-step active">
              <div className="form-group">
                <label className="form-label">Select Your Location</label>
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
                      e.preventDefault();
                      handleNext();
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.location.city}
                  className="form-input"
                  readOnly
                />
                {errors.city && (
                  <span className="form-error">{errors.city}</span>
                )}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Province"
                  value={formData.location.province}
                  className="form-input"
                  readOnly
                />
                {errors.province && (
                  <span className="form-error">{errors.province}</span>
                )}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Country"
                  value={formData.location.country}
                  className="form-input"
                  readOnly
                />
                {errors.country && (
                  <span className="form-error">{errors.country}</span>
                )}
              </div>

              <div className="form-navigation">
                <div></div>
                <button onClick={handleNext} className="nav-button btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Restaurant */}
          {step === 2 && (
            <div className="form-step active">
              <div className="form-group">
                <label className="form-label">
                  Select Restaurant for {formData.location.city},{" "}
                  {formData.location.province}, {formData.location.country}
                </label>

                <div className="search-input-container">
                  <input
                    type="text"
                    placeholder="Search Restaurant"
                    className="form-input"
                    value={formData.restaurant}
                    onChange={handleRestaurantSearch}
                    onKeyDown={handleKeyDown}
                    onFocus={handleRestaurantFocus}
                  />
                  {showSuggestions && restaurantSuggestions.length > 0 && (
                    <ul className="suggestions-dropdown">
                      {restaurantSuggestions.map((restaurant, index) => (
                        <li
                          key={restaurant._id}
                          className={`suggestion-item ${
                            index === activeSuggestion ? "active" : ""
                          }`}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              restaurant: restaurant.name,
                              restaurantId: restaurant._id,
                              address: restaurant.address.street,
                            });
                            setShowSuggestions(false);
                          }}
                        >
                          {restaurant.name} - {restaurant.address.street}
                        </li>
                      ))}
                      <li
                        className="suggestion-item add-restaurant-option"
                        onClick={() => setShowRestaurantModal(true)}
                        style={{
                          borderTop: "1px solid #eee",
                          fontWeight: "bold",
                          color: "#b08bd4",
                        }}
                      >
                        + Add a new restaurant
                      </li>
                    </ul>
                  )}
                </div>

                {/* Add Restaurant Button */}
                <div className="restaurant-options">
                  <button
                    type="button"
                    onClick={() => setShowRestaurantModal(true)}
                    className="add-restaurant-btn"
                  >
                    <span>+</span> Can't find your restaurant? Add it here
                  </button>
                </div>
              </div>

              <div className="form-navigation">
                <button
                  onClick={handlePrevious}
                  className="nav-button btn-secondary"
                >
                  Previous
                </button>
                <button onClick={handleNext} className="nav-button btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Add Food Items */}
          {step === 3 && (
            <div className="form-step active">
              <div className="form-group">
                <FoodItemForm
                  restaurantId={formData.restaurantId}
                  onFoodItemsUpdated={(foodItems) =>
                    handleUpdate({ foodItems })
                  }
                  existingFoodItems={existingFoodItems}
                />
              </div>

              <div className="form-navigation">
                <button
                  onClick={handlePrevious}
                  className="nav-button btn-secondary"
                >
                  Previous
                </button>
                <button onClick={handleNext} className="nav-button btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Add Ratings */}
          {step === 4 && (
            <div className="form-step active">
              <div className="form-group">
                <label className="form-label">Rate Your Food Items</label>
                <div className="food-ratings-container">
                  {formData.foodItems.map((foodItem, index) => (
                    <div key={index} className="food-rating-item">
                      <RatingScale
                        foodItemName={foodItem.name}
                        onRatingChange={(rating) => {
                          const updatedRatings = [...formData.ratings];
                          updatedRatings[index] = rating;
                          handleUpdate({ ratings: updatedRatings });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-navigation">
                <button
                  onClick={handlePrevious}
                  className="nav-button btn-secondary"
                >
                  Previous
                </button>
                <button onClick={handleNext} className="nav-button btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Add Photos */}
          {step === 5 && (
            <div className="form-step active">
              <div className="form-group">
                <label className="form-label">Upload Photos (Optional)</label>
                <div className="photo-upload-container">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="form-input"
                    onChange={handleFilesSelected}
                  />
                  <button
                    type="button"
                    className={`nav-button btn-secondary ${
                      uploading ? "loading" : ""
                    }`}
                    onClick={handleUploadPhotos}
                    disabled={uploading || selectedFiles.length === 0}
                  >
                    {uploading ? "Uploading..." : "Upload Selected"}
                  </button>
                  <div
                    className="photo-previews"
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 12,
                    }}
                  >
                    {selectedFiles.map((f, i) => (
                      <img
                        key={i}
                        src={URL.createObjectURL(f)}
                        alt="preview"
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #eee",
                        }}
                      />
                    ))}
                    {uploadedPhotos.map((p, i) => (
                      <img
                        key={`up-${i}`}
                        src={p.url}
                        alt="uploaded"
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #eee",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-navigation">
                <button
                  onClick={handlePrevious}
                  className="nav-button btn-secondary"
                >
                  Previous
                </button>
                <button onClick={handleNext} className="nav-button btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Confirm Review */}
          {step === 6 && (
            <div className="form-step active">
              <div className="form-group">
                <label className="form-label">Review Your Submission</label>

                <div className="summary-item">
                  <strong>Location:</strong>{" "}
                  {`${formData.location.city}, ${formData.location.province}, ${formData.location.country}`}
                </div>

                <div className="summary-item">
                  <strong>Restaurant:</strong> {formData.restaurant}
                </div>

                <div className="summary-item">
                  <strong>Food Items & Ratings:</strong>
                  <ul>
                    {formData.foodItems.map((item, index) => (
                      <li key={index}>
                        {item.name} - {item.category}
                        {item.subCategory &&
                          item.subCategory.trim() !== "" &&
                          ` (${item.subCategory})`}
                        , Price: ${item.price} -{" "}
                        <strong>
                          Rating: {formData.ratings[index] || "Not rated"}/100
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="form-group">
                  <label className="form-label">Purchase Date:</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, purchaseDate: e.target.value })
                    }
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-navigation">
                <button
                  onClick={handlePrevious}
                  className="nav-button btn-secondary"
                >
                  Previous
                </button>
                <button
                  onClick={handleSubmit}
                  className="nav-button btn-success"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Modal */}
      <RestaurantModal
        isOpen={showRestaurantModal}
        onClose={() => setShowRestaurantModal(false)}
        locationData={formData.location}
        onRestaurantAdded={handleRestaurantAdded}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccessOverlay}
        onClose={() => setShowSuccessOverlay(false)}
        restaurantName={addedRestaurantName}
      />

      {/* Error Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />
    </div>
  );
}

export default ReviewSubmissionPage;
