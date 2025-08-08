import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import CitySearch from "../components/CitySearch";
import SEO from "../components/SEO";
import axios from "../api/axios";

const libraries = ["places"]; // kept for reference; loading handled by CitySearch

// Simple in-memory + localStorage geocode cache
const getCachedGeocode = (key) => {
  try {
    const val = localStorage.getItem(`geocode:${key}`);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};
const setCachedGeocode = (key, value) => {
  try {
    localStorage.setItem(`geocode:${key}`, JSON.stringify(value));
  } catch {}
};

function MapRatingsPage() {
  const [selectedCity, setSelectedCity] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 43.6532, lng: -79.3832 }); // Default: Toronto
  const [zoom, setZoom] = useState(11);
  const [markers, setMarkers] = useState([]);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(
    typeof window !== "undefined" && !!window.google && !!window.google.maps
  );
  const mapRef = useRef(null);

  // Watch for Google Maps availability (CitySearch loads it)
  useEffect(() => {
    if (mapsReady) return;
    const interval = setInterval(() => {
      if (
        typeof window !== "undefined" &&
        window.google &&
        window.google.maps
      ) {
        setMapsReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [mapsReady]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Geocode a free-form address string via JS API
  const geocodeAddress = useCallback(async (addressString) => {
    const cached = getCachedGeocode(addressString);
    if (cached) return cached;

    if (!window.google || !window.google.maps) return null;
    const geocoder = new window.google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ address: addressString }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          const loc = results[0].geometry.location;
          const point = { lat: loc.lat(), lng: loc.lng() };
          setCachedGeocode(addressString, point);
          resolve(point);
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  const addressToString = (addr) => {
    if (!addr) return "";
    const parts = [addr.street, addr.city, addr.province, addr.country].filter(
      Boolean
    );
    return parts.join(", ");
  };

  // Fetch restaurants for the selected city
  const fetchRestaurants = useCallback(async (cityObj) => {
    if (!cityObj?.city || !cityObj?.province || !cityObj?.country) return [];
    try {
      const { data } = await axios.get(`/restaurants/search`, {
        params: {
          city: cityObj.city,
          province: cityObj.province,
          country: cityObj.country,
        },
      });
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Failed fetching restaurants", e?.message);
      return [];
    }
  }, []);

  // Fetch overall score for a restaurant
  const fetchScore = useCallback(async (restaurantId) => {
    try {
      const { data } = await axios.get(
        `/food-items/restaurant/${restaurantId}/scores`
      );
      return data?.overallAverageScore || 0;
    } catch {
      return 0;
    }
  }, []);

  // When city changes, center map and load restaurants + scores + geocodes
  useEffect(() => {
    const run = async () => {
      if (!mapsReady || !selectedCity) return;
      setLoading(true);

      // Center on city via geocode
      const cityString = `${selectedCity.city}, ${selectedCity.province}, ${selectedCity.country}`;
      const cityPoint = await geocodeAddress(cityString);
      if (cityPoint) {
        setMapCenter(cityPoint);
        setZoom(12);
      }

      // Load restaurants
      const list = await fetchRestaurants(selectedCity);

      // For each, fetch score and geocode
      const results = [];
      for (const r of list) {
        const overall = await fetchScore(r._id);
        if (!overall || overall <= 0) continue; // only markers for rated restaurants
        const addrString = addressToString(r.address);
        if (!addrString) continue;
        const point = await geocodeAddress(addrString);
        if (!point) continue;
        results.push({
          id: r._id,
          name: r.name,
          address: r.address,
          point,
          overall: Math.round(overall),
          cuisine: Array.isArray(r.cuisine) ? r.cuisine.join(", ") : r.cuisine,
        });
      }

      setMarkers(results);
      setLoading(false);
    };
    run();
  }, [mapsReady, selectedCity, geocodeAddress, fetchRestaurants, fetchScore]);

  const handleSelectCity = (city) => setSelectedCity(city);

  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: "70vh",
      borderRadius: 16,
      boxShadow: "0 10px 40px rgba(176,139,212,0.15)",
      border: "1px solid #e8eaf5",
    }),
    []
  );

  const scoreMarkerLabel = (score) => ({
    text: String(score),
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
  });

  const scoreMarkerIcon = (score) => {
    if (!window.google || !window.google.maps) return undefined;
    // Color buckets roughly aligned with RatingScale
    let color = "#32CD32"; // default mid green
    if (score <= 10) color = "#FF0000";
    else if (score <= 30) color = "#FF8C00";
    else if (score <= 50) color = "#FFD700";
    else if (score <= 65) color = "#90EE90";
    else if (score <= 75) color = "#32CD32";
    else if (score <= 85) color = "#228B22";
    else if (score <= 95) color = "#00FF7F";
    else color = "#d4af37";

    // Simple circle SVG icon with color
    const svg = {
      path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 1,
      anchor: new window.google.maps.Point(12, 12),
      labelOrigin: new window.google.maps.Point(12, 13),
    };
    return svg;
  };

  return (
    <div className="leaderboards-page" style={{ paddingTop: "110px" }}>
      <SEO
        title="Restaurant Map | Best Food App"
        description="Explore restaurants on an interactive map with score markers."
      />

      <div className="leaderboards-header">
        <h1 className="page-title">Restaurant Map</h1>
        <p className="page-subtitle">
          See rated restaurants around your selected city
        </p>
      </div>

      <div className="search-section" style={{ maxWidth: 900, marginTop: 0 }}>
        <div className="city-search-container">
          <label className="search-label">Choose Your City</label>
          <CitySearch onSelectCity={handleSelectCity} />
        </div>
      </div>

      {mapsReady ? (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={zoom}
            onLoad={onMapLoad}
            options={{
              disableDefaultUI: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {markers.map((m) => (
              <MarkerF
                key={m.id}
                position={m.point}
                label={scoreMarkerLabel(m.overall)}
                icon={scoreMarkerIcon(m.overall)}
                onClick={() => setActiveMarkerId(m.id)}
              />
            ))}

            {markers.map(
              (m) =>
                activeMarkerId === m.id && (
                  <InfoWindowF
                    key={`info-${m.id}`}
                    position={m.point}
                    onCloseClick={() => setActiveMarkerId(null)}
                  >
                    <div style={{ maxWidth: 240 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>
                        {m.name}
                      </div>
                      <div
                        className="text-muted small"
                        style={{ marginBottom: 6 }}
                      >
                        {m.address?.street ? `${m.address.street}, ` : ""}
                        {m.address?.city}, {m.address?.province}
                      </div>
                      {m.cuisine && (
                        <div className="small" style={{ marginBottom: 8 }}>
                          Cuisine: {m.cuisine}
                        </div>
                      )}
                      <a className="small" href={`/restaurant/${m.id}`}>
                        View details →
                      </a>
                    </div>
                  </InfoWindowF>
                )
            )}
          </GoogleMap>

          <div style={{ marginTop: 12 }} className="text-muted small">
            {loading
              ? "Loading markers…"
              : `${markers.length} rated restaurants shown`}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 40 }}>Preparing map…</div>
      )}
    </div>
  );
}

export default MapRatingsPage;
