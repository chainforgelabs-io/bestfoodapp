// City URL utilities for SEO
export const formatCityForUrl = (city, province, country) => {
  const formatForUrl = (str) =>
    str
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  return {
    cityUrl: formatForUrl(city),
    provinceUrl: formatForUrl(province),
    countryUrl: formatForUrl(country),
  };
};

export const parseUrlToCity = (cityParam, provinceParam, countryParam) => {
  const parseFromUrl = (str) =>
    str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return {
    city: parseFromUrl(cityParam),
    province: provinceParam ? parseFromUrl(provinceParam) : "",
    country: countryParam ? parseFromUrl(countryParam) : "",
  };
};

export const generateCityUrl = (
  city,
  province,
  country,
  basePath = "/city"
) => {
  const { cityUrl, provinceUrl, countryUrl } = formatCityForUrl(
    city,
    province,
    country
  );
  return `${basePath}/${cityUrl}/${provinceUrl}/${countryUrl}`;
};

// Generate SEO-friendly page titles and descriptions
export const generateSeoMeta = (city, province, country, page = "home") => {
  const location = `${city}, ${province}, ${country}`;

  const meta = {
    home: {
      title: `Best Food in ${city}, ${province} | Food Rankings & Reviews`,
      description: `Discover the highest-rated restaurants and food in ${location}. Read reviews, see rankings, and find the best dining experiences near you.`,
      keywords: `best food ${city}, restaurants ${city}, food reviews ${city}, ${city} dining, ${province} restaurants`,
    },
    leaderboards: {
      title: `${city} Food Leaderboards | Top Restaurants & Food Rankings`,
      description: `See the top dishes and restaurants in ${location}. Compare ratings and discover what locals rank highest.`,
      keywords: `${city} food rankings, best restaurants ${city}, top food ${city}, ${city} leaderboards, ${province} food`,
    },
  };

  return meta[page] || meta.home;
};
