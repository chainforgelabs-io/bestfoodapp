import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { parseUrlToCity, generateCityUrl } from "../utils/cityUtils";

export const useCityFromUrl = (basePath = "/city") => {
  const { cityName, province, country } = useParams();
  const navigate = useNavigate();
  const [cityFromUrl, setCityFromUrl] = useState(null);
  const [hasUrlCity, setHasUrlCity] = useState(false);

  useEffect(() => {
    if (cityName) {
      const parsedCity = parseUrlToCity(
        cityName,
        province || "",
        country || ""
      );

      setCityFromUrl(parsedCity);
      setHasUrlCity(true);
    } else {
      setCityFromUrl(null);
      setHasUrlCity(false);
    }
  }, [cityName, province, country]);

  const updateUrlWithCity = (city, province, country) => {
    const newUrl = generateCityUrl(city, province, country, basePath);
    navigate(newUrl, { replace: true });
  };

  return {
    cityFromUrl,
    hasUrlCity,
    updateUrlWithCity,
  };
};
