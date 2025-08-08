import React from "react";
import SEO from "../components/SEO";
import "../styles/RatingScale.css";

function ScoringCriteriaPage() {
  const criteria = [
    {
      range: "0-10",
      label: "Inedible",
      color: "#FF0000",
      desc: "Completely unacceptable, harmful, or disgusting",
    },
    {
      range: "11-30",
      label: "Subpar",
      color: "#FF8C00",
      desc: "Poor quality, significant issues",
    },
    {
      range: "31-50",
      label: "Mediocre",
      color: "#FFD700",
      desc: "Average, nothing special",
    },
    {
      range: "51-65",
      label: "Decent",
      color: "#90EE90",
      desc: "Acceptable, meets basic expectations",
    },
    {
      range: "66-75",
      label: "Good",
      color: "#32CD32",
      desc: "Above average, enjoyable",
    },
    {
      range: "76-85",
      label: "Very Good",
      color: "#228B22",
      desc: "High quality, impressive",
    },
    {
      range: "86-95",
      label: "Excellent",
      color: "#00FF7F",
      desc: "Outstanding, memorable experience",
    },
    {
      range: "96-100",
      label: "Masterpiece",
      color: "#d4af37",
      desc: "Lifechanging, flawless, near perfection",
    },
  ];

  return (
    <div className="leaderboards-page" style={{ paddingTop: "120px" }}>
      <SEO
        title="Scoring Criteria | Best Food App"
        description="Understand our 0–100 scoring criteria used to evaluate food items."
      />

      <div className="leaderboards-header">
        <h1 className="page-title">Scoring Criteria</h1>
        <p className="page-subtitle">
          How we standardize ratings across reviews
        </p>
      </div>

      <div className="rating-scale-container" style={{ maxWidth: 720 }}>
        <div className="info-box">
          <h4>Rating Scale Guide (0–100)</h4>
          <div className="info-content">
            {criteria.map((c) => (
              <div key={c.range} className="info-item">
                <span
                  className="score-range"
                  style={{ backgroundColor: c.color }}
                >
                  {c.range}
                </span>
                <span>
                  <strong>{c.label}</strong> — {c.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-muted small" style={{ marginTop: 10 }}>
          These definitions are the same as Step 4 of the review submission flow
          (Rate Your Food Items).
        </p>
      </div>
    </div>
  );
}

export default ScoringCriteriaPage;
