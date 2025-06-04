import React, { useState, useRef, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const libraries = ["places"];

// Add province mapping
const provinceMapping = {
  "Saskatchewan": "SK",
  "Alberta": "AB",
  "British Columbia": "BC",
  "Ontario": "ON",
  "Quebec": "QC",
  "New York": "NY",
  "California": "CA",
  // Add more as needed
};

const CitySearch = ({ onSelectCity, onEnterPress }) => {
  const [city, setCity] = useState("");
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "AIzaSyCj6cdcj9Jit0moxS2Obmng_kHkRyeQYeE",
    libraries: libraries,
  });

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      // Initialize the new PlaceAutocompleteElement
      try {
        // Try using the new PlaceAutocompleteElement if available
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          const autocomplete =
            new window.google.maps.places.PlaceAutocompleteElement({
              componentRestrictions: { country: ["us", "ca"] }, // Limit to US and Canada
              fields: ["address_components", "geometry", "name"],
              types: ["(cities)"],
            });

          autocomplete.addEventListener("gmp-placeselect", (event) => {
            handlePlaceChanged(event.place);
          });

          inputRef.current.appendChild(autocomplete);
          autocompleteRef.current = autocomplete;
        } else {
          // Fallback to the old Autocomplete for backwards compatibility
          const autocomplete = new window.google.maps.places.Autocomplete(
            inputRef.current,
            {
              componentRestrictions: { country: ["us", "ca"] },
              fields: ["address_components", "geometry", "name"],
              types: ["(cities)"],
            }
          );

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            handlePlaceChanged(place);
          });

          autocompleteRef.current = autocomplete;
        }
      } catch (error) {
        console.warn("Error initializing Google Places Autocomplete:", error);
      }
    }
  }, [isLoaded]);

  // Handle place selection and extract city, province, and country
  const handlePlaceChanged = (place) => {
    if (place && place.address_components) {
      const cityName =
        place.address_components.find((comp) => comp.types.includes("locality"))
          ?.long_name || "";
      const provinceLong =
        place.address_components.find((comp) =>
          comp.types.includes("administrative_area_level_1")
        )?.long_name || "";
      const country =
        place.address_components.find((comp) => comp.types.includes("country"))
          ?.long_name || "";

      // Map province to abbreviation if it exists in our mapping
      const province = provinceMapping[provinceLong] || provinceLong;

      if (cityName && province && country) {
        const formattedCity = `${cityName}, ${provinceLong}, ${country}`;
        setCity(formattedCity);
        onSelectCity({ city: cityName, province, country });
        return true; // City has been selected properly
      } else {
        console.error("Could not extract city, province, or country.");
        return false; // City selection failed
      }
    } else {
      console.error("Place selection did not return valid address components.");
      return false;
    }
  };

  // Handle the Enter key press for form submission
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onEnterPress) {
        onEnterPress();
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Move focus to the dropdown options if available
      const dropdown = document.querySelector(".pac-container");
      if (dropdown) {
        const activeItem =
          dropdown.querySelector(".pac-item-selected") ||
          dropdown.querySelector(".pac-item");
        if (activeItem) {
          activeItem.focus();
        }
      }
    }
  };

  // Handle focus to disable autocomplete
  const handleFocus = (e) => {
    e.target.setAttribute("readonly", true);
    setTimeout(() => {
      e.target.removeAttribute("readonly");
    }, 100);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Hidden dummy inputs to trick Chrome autocomplete */}
      <input
        type="text"
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        autoComplete="off"
        tabIndex="-1"
        aria-hidden="true"
      />
      <input
        type="password"
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        autoComplete="off"
        tabIndex="-1"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={city}
        placeholder="Enter city"
        onChange={(e) => setCity(e.target.value)}
        onKeyDown={handleKeyDown}
        className="search-input"
        autoComplete="off"
        name="google-maps-search"
        data-form-type="other"
        role="combobox"
        id="google-places-autocomplete"
        onFocus={handleFocus}
      />
    </div>
  );
};

export default CitySearch;
