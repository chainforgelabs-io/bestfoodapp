import React, { useState } from "react";
import { Autocomplete } from "@react-google-maps/api";

const CitySearch = ({ onSelectCity, onEnterPress }) => {
  const [autocomplete, setAutocomplete] = useState(null);
  const [city, setCity] = useState("");

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
        const province =
          place.address_components.find((comp) =>
            comp.types.includes("administrative_area_level_1")
          )?.long_name || ""; // Use short_name for abbreviations
        const country =
          place.address_components.find((comp) =>
            comp.types.includes("country")
          )?.long_name || "";

        if (cityName && province && country) {
          const formattedCity = `${cityName}, ${province}, ${country}`;
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
      const placeSelected = handlePlaceChanged(); // Make sure the place is selected
      if (placeSelected) {
        onEnterPress(); // If place is selected, submit the form
      }
    }
  };

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
