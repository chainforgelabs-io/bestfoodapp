// src/pages/LeaderboardsPage.js
import React, { useMemo, useState, useEffect } from "react";
import axios from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import CitySearch from "../components/CitySearch";
import { useCityFromUrl } from "../hooks/useCityFromUrl";
import { generateSeoMeta, generateCityUrl } from "../utils/cityUtils";
import { restaurantPath } from "../utils/restaurantUrls";
import { Compass, Building2, Store, Crown } from "lucide-react";
import { getCategoryIcon } from "../utils/categoryIcon";
import "../styles/LeaderboardsPage.css";

const SITE_URL = "https://bestfoodapp.com";
const MIN_TYPED_BOARD = 7;
const MIN_CITY_RESTAURANTS = 5;
const CITY_BOARD_CAP = 10;
const HERO_KEYS = new Set([
  "bestCities",
  "bestRestaurants",
  "bestOverallFood",
]);

const FIXED_HEADER_ICONS = {
  bestCities: Building2,
  bestRestaurants: Store,
  bestOverallFood: Crown,
};

const GLOBAL_CATEGORIES = [
  { key: "bestCities", title: "Best Cities", category: null, type: "cities" },
  {
    key: "bestRestaurants",
    title: "Best Restaurants",
    category: null,
    type: "restaurants",
  },
  {
    key: "bestOverallFood",
    title: "Best Overall Food",
    category: null,
    type: "overall",
  },
  { key: "bestBurgers", title: "Best Burgers", category: "Burger", type: "food-items" },
  { key: "bestPizza", title: "Best Pizza", category: "Pizza", type: "food-items" },
  { key: "bestTacos", title: "Best Tacos", category: "Tacos", type: "food-items" },
  { key: "bestBurritos", title: "Best Burritos", category: "Burrito", type: "food-items" },
  { key: "bestHotDogs", title: "Best Hot Dogs", category: "Hot Dog", type: "food-items" },
  { key: "bestFries", title: "Best Fries", category: "Fries", type: "food-items" },
  { key: "bestDesserts", title: "Best Desserts", category: "Desserts", type: "food-items" },
  { key: "bestAmerican", title: "Best American", category: "American", type: "cuisine" },
  { key: "bestItalian", title: "Best Italian", category: "Italian", type: "cuisine" },
  { key: "bestVietnamese", title: "Best Vietnamese", category: "Vietnamese", type: "cuisine" },
  { key: "bestMexican", title: "Best Mexican", category: "Mexican", type: "cuisine" },
  { key: "bestBreakfastFood", title: "Best Breakfast Food", category: "Breakfast", type: "cuisine" },
  { key: "bestAsian", title: "Best Asian", category: "Asian", type: "cuisine" },
];

const BOARD_SECTIONS = [
  { id: "places", title: "Places", keys: ["bestCities", "bestRestaurants"] },
  {
    id: "dishes",
    title: "Dishes",
    keys: [
      "bestOverallFood",
      "bestBurgers",
      "bestPizza",
      "bestTacos",
      "bestBurritos",
      "bestHotDogs",
      "bestFries",
      "bestDesserts",
    ],
  },
  {
    id: "cuisines",
    title: "Cuisines",
    keys: [
      "bestAmerican",
      "bestItalian",
      "bestVietnamese",
      "bestMexican",
      "bestBreakfastFood",
      "bestAsian",
    ],
  },
];

function visiblePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function itemDisplayName(item, type) {
  if (type === "cities") return item.name;
  return item.name || item.foodItem?.name || "Unknown Item";
}

function itemHref(item, type) {
  if (type === "cities") {
    if (item.city && item.province && item.country) {
      return generateCityUrl(
        item.city,
        item.province,
        item.country,
        "/leaderboards"
      );
    }
    return null;
  }
  if (type === "food-items" || type === "overall") {
    return restaurantPath(item.foodItem?.restaurant || item.restaurant);
  }
  return restaurantPath(item);
}

function getBoardItems(category, globalLeaderboards) {
  const raw = globalLeaderboards[category.key] || [];
  if (category.type === "cities") {
    const eligible = raw.filter(
      (city) => Number(city.restaurantCount) >= MIN_CITY_RESTAURANTS
    );
    if (eligible.length > CITY_BOARD_CAP) {
      return eligible.slice(0, CITY_BOARD_CAP);
    }
    return raw;
  }
  return raw;
}

function shouldShowBoard(category, items) {
  if (!items.length) return false;
  if (HERO_KEYS.has(category.key)) return true;
  return items.length >= MIN_TYPED_BOARD;
}

// API base URL is now handled by the configured axios instance

function LeaderboardsPage() {
  const navigate = useNavigate();

  // State management
  const [activeCategory, setActiveCategory] = useState("restaurants");
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("All"); // Default to "All" to show all food items
  const [selectedCuisine, setCuisine] = useState("All"); // Default to "All" to show all restaurants
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [globalLeaderboards, setGlobalLeaderboards] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [resetKey, setResetKey] = useState(0); // Key to trigger city search reset

  // Use custom hook for URL-based city detection
  const { cityFromUrl, hasUrlCity, updateUrlWithCity } =
    useCityFromUrl("/leaderboards");

  // Initialize city from URL if present
  useEffect(() => {
    if (hasUrlCity && cityFromUrl && !selectedCity) {
      setSelectedCity(cityFromUrl);
      // Trigger initial leaderboard fetch for the city
      fetchLeaderboardData(cityFromUrl);
    }
  }, [hasUrlCity, cityFromUrl]);

  // Generate SEO meta tags
  const seoMeta =
    selectedCity && selectedCity.city
      ? generateSeoMeta(
          selectedCity.city,
          selectedCity.province,
          selectedCity.country,
          "leaderboards"
        )
      : {
          title: "Best restaurants and dishes | Food leaderboards",
          description:
            "Rankings of the best restaurants and dishes by blended expert and community scores. Pick a city for local leaderboards.",
          keywords:
            "food leaderboards, restaurant rankings, best dishes, top restaurants",
        };

  // Dynamic categories from database
  const [availableCategories, setAvailableCategories] = useState({
    foodTypes: [],
    categories: [],
    subTypes: [],
    cuisineTypes: [],
    restaurantTypes: [],
  });

  // Available categories with fixed icons
  const mainCategories = [
    { id: "restaurants", label: "Restaurants", icon: "fa-solid fa-utensils" },
    { id: "food-items", label: "Food Items", icon: "fa-solid fa-burger" },
    { id: "cuisines", label: "Cuisines", icon: "fa-solid fa-drumstick-bite" },
  ];

  // Updated food categories to match database types - now dynamic
  const foodCategories =
    availableCategories.foodTypes.length > 0
      ? ["All", ...availableCategories.foodTypes]
      : [
          "All",
          "Burger",
          "Pizza",
          "Tacos",
          "Burrito",
          "Hot Dog",
          "Fried Rice",
          "Fries",
          "Desserts",
        ];

  const cuisineTypes =
    availableCategories.cuisineTypes.length > 0
      ? ["All", ...availableCategories.cuisineTypes]
      : [
          "All",
          "Italian",
          "Asian",
          "Mexican",
          "American",
          "Indian",
          "French",
          "Thai",
          "Chinese",
          "Japanese",
          "Mediterranean",
          "Vietnamese",
          "Fast Food",
        ];

  // OPTIMIZED: Fetch global leaderboards using new backend API (replaces the massive function)
  const fetchGlobalLeaderboards = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/leaderboards/global`);
      setGlobalLeaderboards(response.data);
    } catch (error) {
      console.error("Error fetching global leaderboards:", error);
      const emptyLeaderboards = {};
      GLOBAL_CATEGORIES.forEach((cat) => {
        emptyLeaderboards[cat.key] = [];
      });
      setGlobalLeaderboards(emptyLeaderboards);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dynamic categories from database
  const fetchAvailableCategories = async () => {
    try {
      let endpoint = `/leaderboards/categories`;
      const params = {};

      // If city is selected, filter categories by city
      if (selectedCity) {
        params.city = selectedCity.city;
        params.province = selectedCity.province;
        params.country = selectedCity.country;
      }

      const response = await axios.get(endpoint, { params });
      setAvailableCategories(response.data);
      console.log("Available categories loaded:", response.data);
    } catch (error) {
      console.error("Error fetching available categories:", error);
      // Keep default fallback categories
    }
  };

  // Fetch data based on current selections
  const fetchLeaderboardData = async (city) => {
    if (!city) return;

    setLoading(true);
    try {
      // Use the new advanced filtering endpoint
      const endpoint = `/leaderboards/filtered`;
      const params = {
        city: city.city,
        province: city.province,
        country: city.country,
        category: activeCategory,
      };

      // Add specific filtering based on category
      if (activeCategory === "food-items" && selectedFoodCategory !== "All") {
        params.foodType = selectedFoodCategory;
        // Could add subType filtering here if needed
      } else if (
        (activeCategory === "restaurants" || activeCategory === "cuisines") &&
        selectedCuisine !== "All"
      ) {
        // Only filter by cuisine when a specific cuisine is selected (not "All")
        params.cuisine = selectedCuisine;
        // Could add restaurantType filtering here if needed
      }

      const response = await axios.get(endpoint, { params });
      const data = response.data;

      // Data is already scored and sorted from the backend
      setLeaderboardData(data);
    } catch (error) {
      console.warn("Error fetching filtered leaderboard data:", error.message);

      // Fallback to original endpoints if new endpoint fails
      try {
        let fallbackEndpoint = "";
        let fallbackParams = {};

        switch (activeCategory) {
          case "restaurants":
            fallbackEndpoint = `/restaurants/search`;
            fallbackParams = {
              city: city.city,
              province: city.province,
              country: city.country,
            };
            break;

          case "food-items":
            fallbackEndpoint = `/food-items/rank/category/${selectedFoodCategory}/city/${city.city}`;
            break;

          case "cuisines":
            fallbackEndpoint = `/restaurants/search`;
            fallbackParams = {
              city: city.city,
              province: city.province,
              country: city.country,
            };
            break;
        }

        if (fallbackEndpoint) {
          const fallbackResponse = await axios.get(fallbackEndpoint, {
            params: fallbackParams,
          });
          let fallbackData = fallbackResponse.data;

          // Apply cuisine filtering for restaurants/cuisines
          if (
            (activeCategory === "restaurants" ||
              activeCategory === "cuisines") &&
            selectedCuisine
          ) {
            fallbackData = fallbackData.filter(
              (item) =>
                item.cuisine &&
                item.cuisine.some((c) =>
                  c.toLowerCase().includes(selectedCuisine.toLowerCase())
                )
            );
          }

          setLeaderboardData(fallbackData.slice(0, 10));
        } else {
          setLeaderboardData([]);
        }
      } catch (fallbackError) {
        console.error("Fallback endpoint also failed:", fallbackError);
        setLeaderboardData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // OPTIMIZED: Effect to fetch data when selections change - removed duplicate call
  useEffect(() => {
    if (selectedCity) {
      fetchLeaderboardData(selectedCity);
    } else {
      // Only fetch global leaderboards if we don't have them yet
      if (Object.keys(globalLeaderboards).length === 0) {
        fetchGlobalLeaderboards();
      }
    }
  }, [activeCategory, selectedCity, selectedFoodCategory, selectedCuisine]);

  // Effect to fetch available categories when city changes or on initial load
  useEffect(() => {
    fetchAvailableCategories();
  }, [selectedCity]); // Fetch categories when city changes

  // Initial cleanup on component mount
  useEffect(() => {
    // Ensure clean state on page load
    setCuisine("All");
    setSelectedFoodCategory("All");
    setActiveCategory("restaurants");
  }, []); // Run only on mount

  // Reset selectors to "All" when category changes
  useEffect(() => {
    setCuisine("All");
    setSelectedFoodCategory("All");
  }, [activeCategory]);

  // Reset selectors to "All" when city changes
  useEffect(() => {
    setCuisine("All");
    setSelectedFoodCategory("All");
  }, [selectedCity]);

  // Handle city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    updateUrlWithCity(city.city, city.province, city.country);
  };

  // Reset city like home page
  const handleResetCity = () => {
    setSelectedCity(null);
    setSearchTerm("");
    setLeaderboardData([]);
    // Reset selectors to "All" when city is reset
    setCuisine("All");
    setSelectedFoodCategory("All");
    setResetKey((prevKey) => prevKey + 1);
    // Navigate back to leaderboards without city params
    navigate("/leaderboards", { replace: true });
  };

  // Filter data based on search term
  const filteredData = leaderboardData.filter((item) => {
    const name = item.name || item.foodItem?.name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get title based on active category
  const getTitle = () => {
    if (!selectedCity) return "Global Food Leaderboards";

    switch (activeCategory) {
      case "restaurants":
        return selectedCuisine === "All"
          ? `Top 10 Restaurants in ${selectedCity.city}`
          : `Top 10 ${selectedCuisine} Restaurants in ${selectedCity.city}`;
      case "food-items":
        return selectedFoodCategory === "All"
          ? `Top 10 Food Items in ${selectedCity.city}`
          : `Top 10 ${selectedFoodCategory} in ${selectedCity.city}`;
      case "cuisines":
        return selectedCuisine === "All"
          ? `Top 10 Cuisine Types in ${selectedCity.city}`
          : `Top 10 ${selectedCuisine} Spots in ${selectedCity.city}`;
      default:
        return `Leaderboards for ${selectedCity.city}`;
    }
  };

  // Get score for display
  const getScore = (item) => {
    // Handle different data structures

    // For food items from ranking API (has foodItem property)
    if (item.foodItem) {
      const score =
        item.averageScore ||
        item.foodItem.averageScore ||
        item.foodItem.adminScore ||
        item.foodItem.communityScore ||
        0;
      return score > 0 ? Math.round(score) : "N/A";
    }

    // For restaurants with calculated overall score
    if (item.overallScore !== undefined) {
      return item.overallScore !== null ? Math.round(item.overallScore) : "N/A";
    }

    // For direct food items or restaurants
    if (item.overallAverageScore) return Math.round(item.overallAverageScore);
    if (item.adminScore && item.communityScore) {
      return Math.round((item.adminScore + item.communityScore) / 2);
    }

    const score = item.adminScore || item.communityScore || 0;
    return score > 0 ? Math.round(score) : "N/A";
  };

  // Get ranking medal/trophy
  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return "🏆";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  const visibleGlobalBoards = useMemo(() => {
    return GLOBAL_CATEGORIES.map((category) => {
      const items = getBoardItems(category, globalLeaderboards);
      return { category, items, show: shouldShowBoard(category, items) };
    }).filter((board) => board.show);
  }, [globalLeaderboards]);

  const canonicalUrl = selectedCity?.city
    ? `${SITE_URL}${generateCityUrl(
        selectedCity.city,
        selectedCity.province,
        selectedCity.country,
        "/leaderboards"
      )}`
    : `${SITE_URL}/leaderboards`;

  const pageHeading = getTitle();

  const jsonLd = useMemo(() => {
    const breadcrumbs = [
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Leaderboards", url: `${SITE_URL}/leaderboards` },
    ];
    if (selectedCity?.city) {
      breadcrumbs.push({
        name: `${selectedCity.city} leaderboards`,
        url: canonicalUrl,
      });
    }

    const breadcrumbList = {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    };

    const collectionPage = {
      "@type": ["WebPage", "CollectionPage"],
      name: selectedCity?.city
        ? `Food leaderboards in ${selectedCity.city}`
        : "Food leaderboards",
      description: seoMeta.description,
      url: canonicalUrl,
    };

    const lists = [];
    if (selectedCity) {
      if (Array.isArray(leaderboardData) && leaderboardData.length > 0) {
        lists.push({
          "@type": "ItemList",
          name: pageHeading,
          url: canonicalUrl,
          itemListElement: leaderboardData.slice(0, 10).map((item, index) => {
            const href = itemHref(
              item,
              activeCategory === "food-items" ? "food-items" : "restaurants"
            );
            return {
              "@type": "ListItem",
              position: index + 1,
              name: itemDisplayName(item, activeCategory),
              url: href && href !== "/" ? `${SITE_URL}${href}` : undefined,
            };
          }),
        });
      }
    } else {
      visibleGlobalBoards.forEach(({ category, items }) => {
        lists.push({
          "@type": "ItemList",
          name: category.title,
          url: canonicalUrl,
          itemListElement: items.map((item, index) => {
            const href = itemHref(item, category.type);
            return {
              "@type": "ListItem",
              position: index + 1,
              name: itemDisplayName(item, category.type),
              url: href && href !== "/" ? `${SITE_URL}${href}` : undefined,
            };
          }),
        });
      });
    }

    return {
      "@context": "https://schema.org",
      "@graph": [collectionPage, breadcrumbList, ...lists],
    };
  }, [
    selectedCity,
    canonicalUrl,
    seoMeta.description,
    leaderboardData,
    activeCategory,
    visibleGlobalBoards,
    pageHeading,
  ]);

  const cityItemHref = (item) => {
    if (activeCategory === "food-items") {
      return restaurantPath(item.foodItem?.restaurant || item.restaurant);
    }
    return restaurantPath(item);
  };

  return (
    <div className="leaderboards-page">
      <SEO
        title={seoMeta.title}
        description={seoMeta.description}
        keywords={seoMeta.keywords}
        canonicalUrl={canonicalUrl}
        jsonLd={jsonLd}
      />
      <div className="leaderboards-header">
        <h1 className="page-title">Food leaderboards</h1>
        <p className="page-subtitle">
          Rankings of the best dishes and restaurants by blended expert and
          community scores. Choose a city for local boards.
        </p>
      </div>

      {/* City Search Section */}
      <div className="search-section">
        <div className="city-search-container">
          <label className="search-label">Choose Your City</label>
          <CitySearch onSelectCity={handleCitySelect} resetKey={resetKey} />
          {selectedCity && (
            <button onClick={handleResetCity} className="reset-city-button">
              <i className="fa fa-times"></i>
              <span>Reset City</span>
            </button>
          )}
        </div>

        {selectedCity && (
          <div className="current-city">
            <span className="city-badge">
              📍 {selectedCity.city}, {selectedCity.province}
            </span>
          </div>
        )}
      </div>

      {/* Category Selection and Sub-category Selection - only show when city is selected */}
      {selectedCity && (
        <>
          <div className="category-section">
            <h3 className="section-title">Choose Category</h3>
            <div className="category-tabs">
              {mainCategories.map((category) => (
                <button
                  key={category.id}
                  className={`category-tab ${
                    activeCategory === category.id ? "active" : ""
                  }`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span className="category-icon">
                    <i className={category.icon}></i>
                  </span>
                  <span className="category-label">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            {activeCategory === "food-items" && (
              <div className="filter-group">
                <label className="filter-label">Food Category</label>
                <select
                  value={selectedFoodCategory}
                  onChange={(e) => setSelectedFoodCategory(e.target.value)}
                  className="filter-select"
                >
                  {foodCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(activeCategory === "restaurants" ||
              activeCategory === "cuisines") && (
              <div className="filter-group">
                <label className="filter-label">Cuisine Type</label>
                <select
                  value={selectedCuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="filter-select"
                >
                  {cuisineTypes.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search within results */}
            <div className="filter-group">
              <label className="filter-label">Search Results</label>
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Filter results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-search-input"
                />
                <i className="fa fa-search search-icon"></i>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Results Section */}
      <div className="results-section">
        {selectedCity && <h2 className="results-title">{getTitle()}</h2>}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : selectedCity ? (
          // City-specific results
          filteredData.length > 0 ? (
            <ol className="leaderboard-grid">
              {filteredData.map((item, index) => {
                const href = cityItemHref(item);
                const price = visiblePrice(
                  item.price || item.foodItem?.price
                );
                const card = (
                  <>
                  <div className="rank-badge">
                    <span className="rank-icon">{getRankIcon(index)}</span>
                  </div>

                  <div className="card-content">
                    <h3 className="item-name">
                      {item.name || item.foodItem?.name || "Unknown Item"}
                    </h3>

                    {activeCategory === "food-items" && (
                      <p className="restaurant-name">
                        at{" "}
                        {item.foodItem?.restaurant?.name ||
                          item.restaurant?.name}
                      </p>
                    )}

                    {item.cuisine && (
                      <div className="cuisine-tags">
                        {Array.isArray(item.cuisine) ? (
                          item.cuisine.map((c) => (
                            <span key={c} className="cuisine-tag">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="cuisine-tag">{item.cuisine}</span>
                        )}
                      </div>
                    )}

                    <div className="score-container">
                      <div className="score-circle">
                        <span className="score-number">{getScore(item)}</span>
                        <span className="score-label">Score</span>
                      </div>

                      {price != null && (
                        <div className="price-info">
                          <span className="price-label">Price:</span>
                          <span className="price-value">${price}</span>
                        </div>
                      )}
                    </div>

                    {item.address && (
                      <p className="address-info">
                        {item.address.street}, {item.address.city}
                      </p>
                    )}
                  </div>
                  </>
                );
                const className = `leaderboard-card ${index < 3 ? "top-three" : ""}`;
                const key = item._id || item.foodItem?._id || index;
                return (
                  <li key={key}>
                    {href && href !== "/" ? (
                      <Link to={href} className={className}>
                        {card}
                      </Link>
                    ) : (
                      <div className={className}>{card}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No results found</h3>
              <p>Try adjusting your filters or search in a different city</p>
            </div>
          )
        ) : (
          // Global leaderboards when no city selected
          <div className="global-leaderboards">
            <div className="global-intro">
              <div className="prompt-icon">
                <Compass size={20} strokeWidth={2} aria-hidden />
              </div>
              <p className="global-intro-lead">
                Global rankings of top dishes and restaurants. Select a city
                above for local leaderboards.
              </p>
            </div>

            {BOARD_SECTIONS.map((section) => {
              const boards = section.keys
                .map((key) =>
                  visibleGlobalBoards.find((b) => b.category.key === key)
                )
                .filter(Boolean);
              if (!boards.length) return null;
              return (
                <section
                  key={section.id}
                  className="global-board-section"
                  aria-labelledby={`board-section-${section.id}`}
                >
                  <h2
                    id={`board-section-${section.id}`}
                    className="global-section-title"
                  >
                    {section.title}
                  </h2>
                  <div className="global-grid">
                    {boards.map(({ category, items }) => {
                      const HeaderIcon =
                        FIXED_HEADER_ICONS[category.key] ||
                        getCategoryIcon(category.category);
                      return (
                        <article
                          key={category.key}
                          className="global-category-card"
                        >
                          <h3 className="global-category-title">
                            <HeaderIcon size={20} strokeWidth={2} aria-hidden />
                            <span>{category.title}</span>
                          </h3>
                          <ol className="global-items-list">
                            {items.map((item, index) => {
                              const href = itemHref(item, category.type);
                              const price = visiblePrice(
                                item.foodItem?.price || item.price
                              );
                              const address =
                                item.foodItem?.restaurant?.address ||
                                item.restaurant?.address ||
                                item.address;
                              const restaurantName =
                                item.foodItem?.restaurant?.name ||
                                item.restaurant?.name;
                              const rowClass = `global-item${
                                href && href !== "/" ? " global-item-link" : ""
                              }`;
                              const body = (
                                <>
                                  <span className="global-rank">
                                    {index + 1}.
                                  </span>
                                  <div className="global-item-info">
                                    <div
                                      className={`global-item-header ${
                                        category.type === "cities"
                                          ? "cities-layout"
                                          : ""
                                      }`}
                                    >
                                      <span className="global-item-name">
                                        {itemDisplayName(item, category.type)}
                                      </span>
                                      <span className="global-item-score">
                                        {category.type === "cities"
                                          ? getScore(item) === "N/A"
                                            ? `N/A (${item.restaurantCount} restaurants)`
                                            : `${getScore(item)}/100 (${
                                                item.restaurantCount
                                              } restaurants)`
                                          : getScore(item) === "N/A"
                                          ? "N/A"
                                          : `${getScore(item)}/100`}
                                      </span>
                                    </div>
                                    {(category.type === "food-items" ||
                                      category.type === "overall") && (
                                      <>
                                        <div className="global-extra-info">
                                          {restaurantName && (
                                            <span className="global-restaurant">
                                              <Store
                                                size={14}
                                                strokeWidth={2}
                                                aria-hidden
                                              />
                                              {restaurantName}
                                            </span>
                                          )}
                                          {price != null && (
                                            <span className="global-price">
                                              ${price}
                                            </span>
                                          )}
                                        </div>
                                        {address && (
                                          <div className="global-address-row">
                                            <span className="global-address">
                                              {address.street
                                                ? `${address.street}, `
                                                : ""}
                                              {address.city}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {(category.type === "restaurants" ||
                                      category.type === "cuisine") &&
                                      item.address && (
                                        <div className="global-extra-info">
                                          <span className="global-address">
                                            {item.address.street
                                              ? `${item.address.street}, `
                                              : ""}
                                            {item.address.city}
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                </>
                              );
                              return (
                                <li
                                  key={`${category.key}-${item._id || index}`}
                                >
                                  {href && href !== "/" ? (
                                    <Link to={href} className={rowClass}>
                                      {body}
                                    </Link>
                                  ) : (
                                    <div className="global-item">{body}</div>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats Section - only for city results */}
      {selectedCity && leaderboardData.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-title">Quick Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{leaderboardData.length}</div>
              <div className="stat-label">Total Items</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {Math.round(getScore(leaderboardData[0]) || 0)}
              </div>
              <div className="stat-label">Top Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {Math.round(
                  leaderboardData.reduce(
                    (sum, item) => sum + getScore(item),
                    0
                  ) / leaderboardData.length
                ) || 0}
              </div>
              <div className="stat-label">Avg Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaderboardsPage;
