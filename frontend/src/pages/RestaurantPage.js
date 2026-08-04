import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "../styles/RestaurantPage.css";
import axios from "../api/axios";
import SEO from "../components/SEO";

function RestaurantPage() {
  const { restaurantID } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [restaurantScores, setRestaurantScores] = useState(null);
  const [relatedReviews, setRelatedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // To handle navigation back or other actions

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);

        // Fetch restaurant details
        const restaurantResponse = await axios.get(
          `/restaurants/${restaurantID}`
        );
        const restaurantData = restaurantResponse.data;
        setRestaurant(restaurantData);

        // Prefer pretty slug URL in the address bar (SPA replace; server also 301s)
        if (
          restaurantData?.slug &&
          restaurantID !== restaurantData.slug &&
          /^[a-f0-9]{24}$/i.test(restaurantID)
        ) {
          navigate(`/restaurant/${restaurantData.slug}`, { replace: true });
        }

        // Fetch food items for this restaurant
        const foodItemsResponse = await axios.get(
          `/food-items/restaurant/${restaurantID}`
        );
        setFoodItems(foodItemsResponse.data);

        try {
          const scoresResponse = await axios.get(
            `/food-items/restaurant/${restaurantID}/scores`
          );
          setRestaurantScores(scoresResponse.data);
        } catch {
          setRestaurantScores({
            adminAverageScore: 0,
            communityAverageScore: 0,
            overallAverageScore: 0,
          });
        }

        try {
          const reviewsRes = await axios.get(
            `/restaurants/${restaurantResponse.data._id}/reviews`
          );
          const reviews = Array.isArray(reviewsRes.data)
            ? reviewsRes.data
            : reviewsRes.data?.reviews || [];
          const relatedIds = [
            ...new Set(
              reviews.flatMap((r) =>
                (r.relatedReviewIds || []).map((id) => String(id))
              )
            ),
          ].slice(0, 6);
          if (relatedIds.length) {
            const related = await Promise.all(
              relatedIds.map(async (id) => {
                try {
                  const { data } = await axios.get(`/reviews/${id}`);
                  return data;
                } catch {
                  return null;
                }
              })
            );
            setRelatedReviews(related.filter(Boolean));
          } else {
            setRelatedReviews([]);
          }
        } catch {
          setRelatedReviews([]);
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [restaurantID, navigate]);

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

  // Restaurant node only — no free-floating AggregateRating (third-party business).
  // Ratings belong on Review schema emitted at publish time.
  const canonicalPath = restaurant.slug
    ? `/restaurant/${restaurant.slug}`
    : `/restaurant/${restaurant._id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    url: `https://bestfoodapp.com${canonicalPath}`,
    address: restaurant.address
      ? {
          "@type": "PostalAddress",
          streetAddress: restaurant.address.street || "",
          addressLocality: restaurant.address.city || "",
          addressRegion: restaurant.address.province || "",
          postalCode: restaurant.address.postalCode || undefined,
          addressCountry: restaurant.address.country || "CA",
        }
      : undefined,
    servesCuisine: Array.isArray(restaurant.cuisine)
      ? restaurant.cuisine
      : restaurant.type
      ? [restaurant.type]
      : undefined,
  };

  return (
    <div className="restaurant-page-container">
      <SEO
        title={`${restaurant.name} | Restaurant Ratings & Menu`}
        description={`Explore ${
          restaurant.name
        }'s best dishes, ratings, and cuisine in ${
          restaurant?.address?.city || "your city"
        }. See top menu items and reviews.`}
        keywords={`${restaurant.name}, ${restaurant?.type || "restaurant"}, ${
          restaurant?.address?.city || ""
        } food, best food, ratings`}
        canonicalUrl={`https://bestfoodapp.com${canonicalPath}`}
        jsonLd={jsonLd}
      />
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

        {restaurantScores &&
          (restaurantScores.overallAverageScore > 0 ||
            restaurantScores.adminAverageScore > 0 ||
            restaurantScores.communityAverageScore > 0) && (
            <div className="restaurant-scores-banner">
              <div className="restaurant-overall-score-block">
                <span className="restaurant-overall-score-value">
                  {Math.round(restaurantScores.overallAverageScore || 0)}
                </span>
                <span className="restaurant-overall-score-label">Overall</span>
              </div>
              <div className="restaurant-scores-detail scores-section">
                <div className="score-item">
                  <span className="score-label">Admin</span>
                  <span className="score-value">
                    {Math.round(restaurantScores.adminAverageScore || 0)}
                  </span>
                </div>
                <div className="score-item">
                  <span className="score-label">Community</span>
                  <span className="score-value">
                    {Math.round(restaurantScores.communityAverageScore || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
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
                    {item.topPhoto && (
                      <div className="food-item-thumb-wrap">
                        <img
                          src={item.topPhoto}
                          alt={item.name || "Food item"}
                          className="food-item-thumb"
                        />
                      </div>
                    )}
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

      <nav className="restaurant-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {" / "}
        {restaurant.address?.city && (
          <>
            <Link
              to={`/city/${String(restaurant.address.city)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`}
            >
              {restaurant.address.city}
            </Link>
            {" / "}
          </>
        )}
        <span>{restaurant.name}</span>
      </nav>

      {relatedReviews.length > 0 && (
        <div className="food-items-section">
          <h2 className="section-title">Related reviews</h2>
          <ul className="related-reviews-list">
            {relatedReviews.map((r) => (
              <li key={r._id}>
                <Link
                  to={`/restaurant/${
                    r.restaurantId?.slug ||
                    r.restaurantId?._id ||
                    restaurant.slug ||
                    restaurant._id
                  }`}
                >
                  {r.foodItem?.name || "Review"} — score{" "}
                  {Math.round(r.score || 0)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="back-button">
        Back to Previous Page
      </button>
    </div>
  );
}

export default RestaurantPage;
