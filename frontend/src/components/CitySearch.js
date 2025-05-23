import React, { useState, useRef } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";

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
  const [autocomplete, setAutocomplete] = useState(null);
  const [city, setCity] = useState("");
  const inputRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "AIzaSyCj6cdcj9Jit0moxS2Obmng_kHkRyeQYeE",
    libraries: libraries,
  });

  // Load the autocomplete instance
  const handleLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  // Handle place selection and extract city, province, and country
  const handlePlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place && place.address_components) {
        const cityName =
          place.address_components.find((comp) =>
            comp.types.includes("locality")
          )?.long_name || "";
        const provinceLong =
          place.address_components.find((comp) =>
            comp.types.includes("administrative_area_level_1")
          )?.long_name || "";
        const country =
          place.address_components.find((comp) =>
            comp.types.includes("country")
          )?.long_name || "";

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
        console.error(
          "Place selection did not return valid address components."
        );
        return false;
      }
    } else {
      console.error("Autocomplete instance is not loaded.");
      return false;
    }
  };

  // Handle the Enter key press for form submission
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const placeSelected = handlePlaceChanged();
      if (placeSelected && onEnterPress) {
        onEnterPress();
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Move focus to the dropdown options if available
      const dropdown = document.querySelector(".pac-container"); // The class name may vary
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

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <Autocomplete onLoad={handleLoad} onPlaceChanged={handlePlaceChanged}>
      <input
        type="text"
        value={city}
        placeholder="Enter city"
        onChange={(e) => setCity(e.target.value)}
        onKeyDown={handleKeyDown} // Trigger search on Enter
        className="search-input"
      />
    </Autocomplete>
  );
};

export default CitySearch;
