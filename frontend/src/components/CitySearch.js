import React, { useState, useRef, useEffect } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";

const libraries = ["places"];

const CitySearch = ({ onSelectCity, onEnterPress, resetKey }) => {
  const [autocomplete, setAutocomplete] = useState(null);
  const [city, setCity] = useState("");
  const inputRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey:
      process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
      "AIzaSyCj6cdcj9Jit0moxS2Obmng_kHkRyeQYeE",
    libraries: libraries,
  });

  // Clear the search input when resetKey changes
  useEffect(() => {
    if (resetKey) {
      setCity("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [resetKey]);

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

        const province = provinceLong; // Use the full province name from Google Maps

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
      <Autocomplete
        onLoad={handleLoad}
        onPlaceChanged={handlePlaceChanged}
        options={{
          componentRestrictions: { country: ["us", "ca"] },
          fields: ["address_components", "geometry", "name"],
          types: ["(cities)"],
        }}
      >
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
      </Autocomplete>
    </div>
  );
};

export default CitySearch;
