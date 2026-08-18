import React, { useState, useEffect, useRef } from "react";
import CitySearch from "../components/CitySearch";
import FoodItemForm from "../components/FoodItemForm";
import RatingScale from "../components/RatingScale";
import RestaurantModal from "../components/RestaurantModal";
import Notification from "../components/Notification";
import SuccessOverlay from "../components/SuccessOverlay";
import ImageCropModal from "../components/ImageCropModal";
import axios from "../api/axios";
import "../styles/ReviewSubmissionPage.css";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import SEO from "../components/SEO";
import { matchRestaurant } from "../utils/receiptAutofill";

// Convert an OCR'd date (ISO string or Date) into the yyyy-mm-dd value the
// native date input expects. Returns "" when the date is missing/invalid.
const receiptDateToInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const todayInputDate = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

// Build an initial location from a scanned receipt's vendor address. Receipt
// addresses are inconsistent, so this is only a starting point — the user can
// re-pick the location via CitySearch on Step 1.
const receiptAddressToLocation = (parsed) => {
  const addr = parsed?.vendorAddress;
  if (!addr) return null;
  const city = (addr.city || "").trim();
  const province = (addr.state || "").trim();
  const country = (addr.country || "").trim();
  if (!city && !province && !country) return null;
  return { city, province, country };
};

function ReviewSubmissionPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const restaurantIdFromQuery =
    searchParams.get("restaurantId") || searchParams.get("restaurant");

  // Structured data read from the user's receipt (if they scanned one). Used
  // to autofill the restaurant, food items, and purchase date below.
  const [receiptParsed] = useState(
    location.state?.receiptParsed ||
      location.state?.formData?.receiptParsed ||
      null
  );
  // Guards so autofill only runs once and never overrides the user's edits.
  const restaurantAutofilledRef = useRef(false);

  const [formData, setFormData] = useState({
    location:
      location.state?.formData?.location ||
      receiptAddressToLocation(
        location.state?.receiptParsed ||
          location.state?.formData?.receiptParsed
      ) || {
        city: "",
        province: "",
        country: "",
      },
    restaurant:
      location.state?.formData?.restaurant ||
      location.state?.restaurantName ||
      "",
    restaurantId:
      location.state?.formData?.restaurantId ||
      location.state?.restaurantId ||
      restaurantIdFromQuery ||
      "",
    address: location.state?.formData?.address || "",
    foodItems: location.state?.formData?.foodItems || [],
    ratings: [],
    photos: [],
    purchaseDate: receiptDateToInput(
      location.state?.receiptParsed?.purchaseDate ||
        location.state?.formData?.receiptParsed?.purchaseDate
    ) || todayInputDate(),
    comment: location.state?.formData?.comment || "",
    receiptId:
      location.state?.receiptId ||
      location.state?.formData?.receiptId ||
      "",
    receiptThumbUrl:
      location.state?.receiptThumbUrl ||
      location.state?.formData?.receiptThumbUrl ||
      null,
    receiptParsed:
      location.state?.receiptParsed ||
      location.state?.formData?.receiptParsed ||
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
  const [cropQueue, setCropQueue] = useState([]); // files awaiting crop
  const [cropIndex, setCropIndex] = useState(0);
  const [croppedBatch, setCroppedBatch] = useState([]); // confirmed crops this batch
  const [recropIndex, setRecropIndex] = useState(null); // index in selectedFiles being re-adjusted

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

  const loadFoodItemsForRestaurant = async (restaurantId) => {
    if (!restaurantId) return;
    try {
      const response = await axios.get(`/food-items/restaurant/${restaurantId}`);
      setExistingFoodItems(response.data || []);
    } catch (error) {
      if (error.response?.status === 404) {
        setExistingFoodItems([]);
      } else {
        console.error("Error fetching food items for the restaurant:", error);
      }
    }
  };

  // Prefill restaurant from query/state (restaurant page, map pin, receipt).
  useEffect(() => {
    const id = formData.restaurantId;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        if (!formData.restaurant) {
          const { data } = await axios.get(`/restaurants/${id}`);
          if (cancelled || !data) return;
          setFormData((prev) => ({
            ...prev,
            restaurant: data.name || prev.restaurant,
            restaurantId: data._id || id,
            address: data.address?.street || prev.address,
            location: {
              city: data.address?.city || prev.location.city,
              province: data.address?.province || prev.location.province,
              country: data.address?.country || prev.location.country,
            },
          }));
        }
        await loadFoodItemsForRestaurant(id);
      } catch (e) {
        console.warn("Could not load restaurant", e?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.restaurantId]);

  // Autofill the restaurant on Step 2 from the scanned receipt's vendor name.
  // If a confident match already exists we select it; otherwise we pre-fill the
  // search box with the vendor name so the user can pick it or add it as new.
  useEffect(() => {
    if (restaurantAutofilledRef.current) return;
    const vendor = receiptParsed?.vendorName;
    if (!vendor) return;
    const { city, province, country } = formData.location;
    if (!city || !province || !country) return;

    restaurantAutofilledRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const response = await axios.get(`/restaurants/search`, {
          params: { city, province, country },
        });
        if (cancelled) return;
        const match = matchRestaurant(vendor, response.data);
        if (match) {
          setFormData((prev) => ({
            ...prev,
            restaurant: match.restaurant.name,
            restaurantId: match.restaurant._id,
            address: match.restaurant.address?.street,
          }));
          setNotification({
            isVisible: true,
            message: `Matched "${match.restaurant.name}" from your receipt`,
            type: "success",
          });
          return;
        }
        // No confident match: seed the search box with the receipt vendor name.
        setFormData((prev) => ({ ...prev, restaurant: vendor }));
      } catch (err) {
        // 404 (no restaurants in this city yet) or other error: still seed the
        // name so the user can quickly add it via the modal.
        if (!cancelled) {
          setFormData((prev) => ({ ...prev, restaurant: vendor }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [receiptParsed, formData.location]);

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

  // Update form data as each step progresses
  const handleUpdate = (newData) => {
    setFormData((prevData) => ({
      ...prevData,
      ...newData,
    }));
  };

  const selectRestaurantSuggestion = async (restaurant) => {
    if (!restaurant) return;
    if (restaurant.kind === "place") {
      try {
        const { data } = await axios.post(
          `/places/promote/${restaurant.placeId}`,
          {
            cuisine: restaurant.cuisine?.length
              ? restaurant.cuisine
              : restaurant.cuisineHint
                ? [restaurant.cuisineHint]
                : undefined,
            type: restaurant.type || undefined,
          }
        );
        const restaurantId = data.restaurantId;
        setFormData({
          ...formData,
          restaurant: restaurant.name,
          restaurantId,
          address:
            restaurant.displayStreet || restaurant.address?.street || "",
        });
        await loadFoodItemsForRestaurant(restaurantId);
      } catch (err) {
        console.error("Promote place failed", err);
        alert(
          "Could not select this place. Try adding the restaurant manually."
        );
        return;
      }
    } else {
      setFormData({
        ...formData,
        restaurant: restaurant.name,
        restaurantId: restaurant._id,
        address: restaurant.displayStreet || restaurant.address?.street || "",
      });
      await loadFoodItemsForRestaurant(restaurant._id);
    }
    setShowSuggestions(false);
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
        selectRestaurantSuggestion(restaurantSuggestions[activeSuggestion]);
      }
    }
  };

  // Merge DB restaurants + seeded places into suggestion rows
  const loadRestaurantSuggestions = async (searchTerm = "") => {
    if (
      !formData.location.city ||
      !formData.location.province ||
      !formData.location.country
    ) {
      return;
    }

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
        filteredRestaurants = response.data.slice(0, 10);
      } else {
        filteredRestaurants = response.data.filter((restaurant) =>
          restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      const mapped = filteredRestaurants.map((r) => ({
        ...r,
        kind: "restaurant",
        displayStreet: r.address?.street || "",
      }));

      // Seeded places (no public page until reviewed)
      if (searchTerm.trim().length >= 2) {
        try {
          const placesRes = await axios.get("/places/search", {
            params: {
              q: searchTerm,
              city: formData.location.city,
              province: formData.location.province,
              country: formData.location.country,
              limit: 15,
            },
          });
          const placeRows = (placesRes.data.results || [])
            .filter((p) => p.kind === "place")
            .map((p) => ({
              _id: p.placeId,
              placeId: p.placeId,
              kind: "place",
              name: p.name,
              displayStreet: p.street,
              address: { street: p.street },
              cuisine: p.cuisine || [],
              type: p.type || null,
              cuisineHint: p.cuisineHint,
              website: p.website,
              gersId: p.gersId,
            }));
          const restaurantIds = new Set(mapped.map((r) => String(r._id)));
          for (const p of placeRows) {
            if (!restaurantIds.has(String(p._id))) mapped.push(p);
          }
        } catch (placeErr) {
          console.warn("Places search unavailable", placeErr);
        }
      }

      setRestaurantSuggestions(mapped.slice(0, 25));
    } catch (error) {
      console.error("Error searching restaurants:", error);
    }
  };

  // Function to handle searching restaurants
  const handleRestaurantSearch = async (e) => {
    const searchTerm = e.target.value;
    setFormData({ ...formData, restaurant: searchTerm });
    setShowSuggestions(true);
    await loadRestaurantSuggestions(searchTerm);
  };

  // Handle input focus to show all restaurants
  const handleRestaurantFocus = async () => {
    setShowSuggestions(true);
    await loadRestaurantSuggestions(formData.restaurant || "");
  };

  // Handle when a restaurant is added via modal
  const handleRestaurantAdded = async (newRestaurant) => {
    // Show success overlay
    setAddedRestaurantName(newRestaurant.name);
    setShowSuccessOverlay(true);

    // Auto-select the newly created restaurant so the user can continue without
    // re-finding it in the list (important for the receipt autofill flow).
    setFormData((prev) => ({
      ...prev,
      restaurant: newRestaurant.name,
      restaurantId: newRestaurant._id,
      address: newRestaurant.address?.street,
    }));
    loadFoodItemsForRestaurant(newRestaurant._id);

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
        "Content-Type": presigned.contentType || file.type || "image/jpeg",
      },
      body: file,
    });
    return { url: presigned.url, key: presigned.key };
  };

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    // Reset the input so re-selecting the same file still triggers onChange.
    e.target.value = "";
    if (files.length === 0) return;
    // Send each photo through the crop/position step before it can be uploaded.
    setCroppedBatch([]);
    setCropIndex(0);
    setCropQueue(files);
  };

  // Advance the crop queue, optionally adding a confirmed cropped file. When the
  // queue is exhausted, append everything confirmed to the selection.
  const advanceCropQueue = (confirmedFile) => {
    const nextBatch = confirmedFile
      ? [...croppedBatch, confirmedFile]
      : croppedBatch;
    if (cropIndex + 1 >= cropQueue.length) {
      if (nextBatch.length > 0) {
        setSelectedFiles((prev) => [...prev, ...nextBatch]);
      }
      setCropQueue([]);
      setCropIndex(0);
      setCroppedBatch([]);
    } else {
      setCroppedBatch(nextBatch);
      setCropIndex((i) => i + 1);
    }
  };

  // Re-open the cropper for an already-selected photo to reframe it.
  const handleRecrop = (idx) => setRecropIndex(idx);

  const handleCropConfirm = (croppedFile) => {
    if (recropIndex !== null) {
      setSelectedFiles((prev) =>
        prev.map((f, i) => (i === recropIndex ? croppedFile : f))
      );
      setRecropIndex(null);
      return;
    }
    advanceCropQueue(croppedFile);
  };

  const handleCropSkip = () => advanceCropQueue(null);

  // Cancel the rest of the queue but keep any photos already confirmed.
  const handleCropClose = () => {
    if (recropIndex !== null) {
      setRecropIndex(null);
      return;
    }
    if (croppedBatch.length > 0) {
      setSelectedFiles((prev) => [...prev, ...croppedBatch]);
    }
    setCropQueue([]);
    setCropIndex(0);
    setCroppedBatch([]);
  };

  const isRecropping = recropIndex !== null && !!selectedFiles[recropIndex];
  const isQueueActive = cropQueue.length > 0 && cropIndex < cropQueue.length;
  const cropModalFile = isRecropping
    ? selectedFiles[recropIndex]
    : cropQueue[cropIndex] || null;

  // Upload a list of files to S3 and return the resulting [{url, key}] objects.
  const uploadFiles = async (files) => {
    const presigned = await requestPresignedUrls(files);
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const res = await uploadToS3(presigned[i], files[i]);
      results.push(res);
    }
    return results;
  };

  const handleUploadPhotos = async () => {
    if (!selectedFiles.length) return;
    try {
      setUploading(true);
      const results = await uploadFiles(selectedFiles);
      setUploadedPhotos((prev) => [...prev, ...results]);
      // Move them out of the pending selection so they aren't uploaded twice.
      setSelectedFiles([]);
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

      const purchaseDateValue = formData.purchaseDate || todayInputDate();

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

      const formattedPurchaseDate = formatDate(purchaseDateValue);

      // Make sure any photos that were selected/cropped but not yet uploaded
      // (the user may have skipped the "Upload Selected" button) get uploaded
      // now, so they actually attach to the review.
      let photoUrls = uploadedPhotos.map((p) => p.url);
      if (selectedFiles.length > 0) {
        try {
          const freshlyUploaded = await uploadFiles(selectedFiles);
          photoUrls = [...photoUrls, ...freshlyUploaded.map((p) => p.url)];
          setUploadedPhotos((prev) => [...prev, ...freshlyUploaded]);
          setSelectedFiles([]);
        } catch (uploadErr) {
          console.error("Photo upload during submit failed", uploadErr);
          setNotification({
            isVisible: true,
            message:
              "We couldn't upload your photos. Please try the photo step again.",
            type: "error",
          });
          return;
        }
      }

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
          comment: formData.comment || "",
          photos: photoUrls,
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
      const firstShare = results[0]?.data?.share || null;
      const firstReviewId = results[0]?.data?._id || null;

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

      navigate("/review-success", {
        state: {
          share: firstShare,
          reviewId: firstReviewId,
        },
      });
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

  const restaurantKnown = Boolean(formData.restaurantId);
  const changeRestaurant = () => {
    setFormData((prev) => ({
      ...prev,
      restaurant: "",
      restaurantId: "",
      address: "",
      foodItems: [],
      ratings: [],
    }));
    setExistingFoodItems([]);
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
          <h1 className="form-heading">
            {restaurantKnown ? "Rate a dish" : "Where did you eat?"}
          </h1>
          <p className="form-subtitle">
            {restaurantKnown
              ? "Pick a dish, score it, and add an optional photo."
              : "Choose a city and restaurant, then rate a dish on one screen."}
          </p>
        </div>

        <div className="form-content">
          {formData.receiptId && (
            <div className="verified-visit-pill">
              {receiptDisplayUrl && (
                <img src={receiptDisplayUrl} alt="" className="verified-visit-thumb" />
              )}
              <div>
                <strong>Verified visit</strong>
                <span>
                  Receipt attached privately — it is not shown on your public
                  review.
                </span>
              </div>
            </div>
          )}

          {!restaurantKnown && (
            <div className="form-step active">
              <div className="form-group">
                <label className="form-label">City</label>
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
                />
                {(formData.location.city ||
                  formData.location.province ||
                  formData.location.country) && (
                  <p className="form-hint">
                    {formData.location.city}
                    {formData.location.province
                      ? `, ${formData.location.province}`
                      : ""}
                    {formData.location.country
                      ? `, ${formData.location.country}`
                      : ""}
                  </p>
                )}
                {errors.city && (
                  <span className="form-error">{errors.city}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Restaurant</label>
                <div className="search-input-container">
                  <input
                    type="text"
                    placeholder={
                      formData.location.city
                        ? "Search restaurant"
                        : "Pick a city first"
                    }
                    className="form-input"
                    value={formData.restaurant}
                    onChange={handleRestaurantSearch}
                    onKeyDown={handleKeyDown}
                    onFocus={handleRestaurantFocus}
                    disabled={!formData.location.city}
                  />
                  {showSuggestions && restaurantSuggestions.length > 0 && (
                    <ul className="suggestions-dropdown">
                      {restaurantSuggestions.map((restaurant, index) => (
                        <li
                          key={`${restaurant.kind || "r"}-${restaurant._id}`}
                          className={`suggestion-item ${
                            index === activeSuggestion ? "active" : ""
                          }`}
                          onClick={() => selectRestaurantSuggestion(restaurant)}
                        >
                          {restaurant.name}
                          {restaurant.displayStreet ||
                          restaurant.address?.street
                            ? ` — ${
                                restaurant.displayStreet ||
                                restaurant.address.street
                              }`
                            : ""}
                          {restaurant.kind === "place" ? " (seeded)" : ""}
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
                <div className="restaurant-options">
                  <button
                    type="button"
                    onClick={() => setShowRestaurantModal(true)}
                    className="add-restaurant-btn"
                    disabled={!formData.location.city}
                  >
                    <span>+</span> Can't find it? Add the restaurant
                  </button>
                </div>
              </div>
            </div>
          )}

          {restaurantKnown && (
            <div className="form-step active quick-review">
              <div className="quick-restaurant-bar">
                <div>
                  <strong>{formData.restaurant || "Selected restaurant"}</strong>
                  {formData.location.city && (
                    <span>
                      {formData.location.city}
                      {formData.location.province
                        ? `, ${formData.location.province}`
                        : ""}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="change-restaurant-btn"
                  onClick={changeRestaurant}
                >
                  Change
                </button>
              </div>

              {!formData.receiptId && (
                <p className="optional-receipt-link">
                  <Link
                    to={`/submit-review/scan?restaurantId=${encodeURIComponent(
                      formData.restaurantId
                    )}`}
                  >
                    Optional: add a receipt for a verified visit
                  </Link>
                </p>
              )}

              <div className="form-group">
                <label className="form-label">Dish</label>
                <FoodItemForm
                  restaurantId={formData.restaurantId}
                  onFoodItemsUpdated={(foodItems) =>
                    handleUpdate({ foodItems })
                  }
                  existingFoodItems={existingFoodItems}
                  receiptItems={receiptParsed?.lineItems || []}
                />
              </div>

              {formData.foodItems.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Score</label>
                  <div className="food-ratings-container">
                    {formData.foodItems.map((foodItem, index) => (
                      <div key={foodItem._id || index} className="food-rating-item">
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
              )}

              <div className="form-group">
                <label className="form-label">Photo (optional)</label>
                <p className="form-hint">
                  After choosing a photo, drag to move and pinch or scroll to
                  zoom so it's framed how you want.
                </p>
                <div className="photo-upload-container">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="form-input"
                    onChange={handleFilesSelected}
                  />
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
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          width: 80,
                          height: 80,
                        }}
                      >
                        <img
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
                        <button
                          type="button"
                          onClick={() => handleRecrop(i)}
                          title="Reframe this photo"
                          style={{
                            position: "absolute",
                            bottom: 4,
                            right: 4,
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "2px 6px",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            lineHeight: 1.2,
                          }}
                        >
                          Adjust
                        </button>
                      </div>
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

              <div className="form-group">
                <label className="form-label" htmlFor="review-comment">
                  Comment (optional)
                </label>
                <textarea
                  id="review-comment"
                  className="form-input"
                  rows={3}
                  placeholder="What stood out?"
                  value={formData.comment || ""}
                  onChange={(e) => handleUpdate({ comment: e.target.value })}
                />
              </div>

              <div className="form-navigation">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="nav-button btn-success"
                  disabled={
                    isSubmitting ||
                    uploading ||
                    !formData.foodItems.length ||
                    formData.foodItems.some(
                      (_, i) =>
                        formData.ratings[i] == null ||
                        formData.ratings[i] === ""
                    )
                  }
                >
                  {isSubmitting ? "Submitting..." : "Submit review"}
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
        initialName={receiptParsed?.vendorName || ""}
      />

      <ImageCropModal
        isOpen={isRecropping || isQueueActive}
        file={cropModalFile}
        index={isRecropping ? 0 : cropIndex}
        total={isRecropping ? 1 : cropQueue.length}
        onConfirm={handleCropConfirm}
        onSkip={handleCropSkip}
        onClose={handleCropClose}
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
