import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";

function BadgePage() {
  const { restaurantSlug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [score, setScore] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`/restaurants/${restaurantSlug}`);
        if (cancelled) return;
        setRestaurant(data);
        try {
          const scoreRes = await axios.get(
            `/restaurants/${data._id || restaurantSlug}/score`
          );
          setScore(scoreRes.data);
        } catch {
          setScore(null);
        }
      } catch {
        if (!cancelled) setRestaurant(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantSlug]);

  if (!restaurant) {
    return (
      <div style={{ padding: "120px 24px", textAlign: "center" }}>
        <SEO title="Badge verification" noindex />
        <p>Badge not found.</p>
        <Link to="/">Home</Link>
      </div>
    );
  }

  const adminScore = Math.round(score?.adminScore || 0);
  const slug = restaurant.slug || restaurant._id;
  const verifyUrl = `https://bestfoodapp.com/badge/${slug}`;
  // Public verification always works. Embed snippets are admin-gated until
  // the 5+ category program gate is live (see /admin/seo).
  const publicSnippet = `<a href="${verifyUrl}" rel="noopener" target="_blank">${restaurant.name} — scored on Best Food App</a>`;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "100px 16px 40px" }}>
      <SEO
        title={`${restaurant.name} score verification | Best Food App`}
        description={`Verified Best Food App score for ${restaurant.name}.`}
        canonicalUrl={verifyUrl}
      />
      <h1>{restaurant.name}</h1>
      <p>Verified score on Best Food App</p>
      <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "#6b4a99" }}>
        {adminScore || "—"}
      </p>
      <p>
        <Link to="/scoring-criteria">Scoring methodology</Link>
      </p>
      <p>
        <Link to={`/restaurant/${slug}`}>View restaurant</Link>
      </p>
      {adminScore >= 76 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "1.1rem" }}>Link snippet</h2>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Share this verification link. Full embed program unlocks in admin
            once a category reaches 5+ scored entries.
          </p>
          <textarea
            readOnly
            value={publicSnippet}
            rows={3}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </div>
  );
}

export default BadgePage;
