import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";
import "../styles/AdminTools.css";

function SeoDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("/seo/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setError("Failed to load SEO dashboard");
      });
  }, []);

  return (
    <div className="admin-tools-page">
      <SEO title="SEO Dashboard | Best Food App" noindex />
      <header className="admin-tools-header">
        <h1>SEO dashboard</h1>
        <p>
          Indexed/published health, category go-live gate, badge embeds, and
          import batch status.
        </p>
        <div className="admin-tools-nav">
          <Link to="/admin/places">Places import</Link>
          <Link to="/admin/social">Social</Link>
        </div>
      </header>

      {error && <p className="admin-tools-message">{error}</p>}
      {!data ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="admin-metrics-grid">
            <div className="admin-metric">
              <span className="admin-metric-value">
                {data.publishedReviews}
              </span>
              <span className="admin-metric-label">Published reviews</span>
            </div>
            <div className="admin-metric">
              <span className="admin-metric-value">
                {data.restaurantPages}
              </span>
              <span className="admin-metric-label">Restaurant pages</span>
            </div>
            <div className="admin-metric">
              <span className="admin-metric-value">
                {data.restaurantsWithSlug}
              </span>
              <span className="admin-metric-label">With slug</span>
            </div>
            <div className="admin-metric">
              <span className="admin-metric-value">
                {data.indexedRatioEstimate != null
                  ? `${Math.round(data.indexedRatioEstimate * 100)}%`
                  : "—"}
              </span>
              <span className="admin-metric-label">Slug coverage</span>
            </div>
            <div className="admin-metric">
              <span className="admin-metric-value">{data.categoriesLive}</span>
              <span className="admin-metric-label">
                Categories live (5+ entries)
              </span>
            </div>
            <div className="admin-metric">
              <span className="admin-metric-value">
                {data.badgeProgramLive ? "ON" : "OFF"}
              </span>
              <span className="admin-metric-label">Badge program gate</span>
            </div>
            <div className="admin-metric">
              <span className="admin-metric-value">
                {data.liveBadgeEmbeds}
              </span>
              <span className="admin-metric-label">Live badge embeds</span>
            </div>
            <div className="admin-metric">
              <span className="admin-metric-value">{data.failedSeoJobs}</span>
              <span className="admin-metric-label">Failed SEO jobs</span>
            </div>
          </div>

          <section className="admin-tools-card">
            <h2>Recent place batches</h2>
            <ul>
              {(data.recentBatches || []).map((b) => (
                <li key={b.batchId}>
                  {b.label} — {b.status} — {b.totalRows} rows
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-tools-card">
            <h2>Recent audit jobs</h2>
            <ul>
              {(data.recentAudits || []).map((a) => (
                <li key={a._id}>
                  {a.job} @ {new Date(a.ranAt).toLocaleString()} —{" "}
                  {JSON.stringify(a.summary)}
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-tools-card">
            <h2>Manual monthly notes</h2>
            <p>
              Track branded search volume for “bestfoodapp” and AI-citation
              checks (ChatGPT / Gemini / Perplexity) outside this dashboard per
              the SEO spec.
            </p>
            <p>Badge hero floor: {data.heroFloor}</p>
          </section>
        </>
      )}
    </div>
  );
}

export default SeoDashboardPage;
