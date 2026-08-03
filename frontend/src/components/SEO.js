import React from "react";
import { Helmet } from "react-helmet-async";

const SEO = ({
  title = "Best Food App - Discover the Best Restaurants in Your City",
  description = "Discover, rate, and review the best restaurants in your city. Find top-rated food spots, share your dining experiences, and explore local culinary gems.",
  keywords = "food, restaurants, reviews, ratings, dining, best food, restaurant finder, food app, culinary, local restaurants",
  image = `${process.env.PUBLIC_URL}/logo512.png`,
  url = "https://bestfoodapp.com",
  type = "website",
  author = "Best Food App",
  canonicalUrl,
  noindex = false,
  jsonLd,
}) => {
  const siteTitle = "Best Food App";
  const fullTitle = title.includes(siteTitle)
    ? title
    : `${title} | ${siteTitle}`;
  const currentUrl = canonicalUrl || url;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />

      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#ff6b35" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteTitle} />

      {/* Optional JSON-LD Structured Data */}
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteTitle,
            url: "https://bestfoodapp.com",
            logo: "https://bestfoodapp.com/logo512.png",
            sameAs: [
              "https://www.instagram.com/bestfoodapp",
              "https://www.facebook.com/bestfoodapp",
              "https://x.com/bestfoodapp",
            ],
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
