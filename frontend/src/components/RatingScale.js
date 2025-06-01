import React, { useState } from "react";
import "../styles/RatingScale.css";

function RatingScale({ onRatingChange, foodItemName }) {
  const [rating, setRating] = useState(50);
  const [showInfo, setShowInfo] = useState(false);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
    onRatingChange(newRating);
  };

  const getRatingLabel = (score) => {
    if (score <= 10) return "Inedible";
    if (score <= 30) return "Subpar";
    if (score <= 50) return "Mediocre";
    if (score <= 65) return "Decent";
    if (score <= 75) return "Good";
    if (score <= 85) return "Very Good";
    if (score <= 95) return "Excellent";
    return "Masterpiece";
  };

  const getRatingColor = (score) => {
    if (score <= 10) return "#FF0000"; // Red
    if (score <= 30) return "#FF8C00"; // Orange
    if (score <= 50) return "#FFD700"; // Yellow
    if (score <= 65) return "#90EE90"; // Light Green
    if (score <= 75) return "#32CD32"; // Mid Green
    if (score <= 85) return "#228B22"; // Dark Green
    if (score <= 95) return "#00FF7F"; // Emerald Green
    return "#FFD700"; // Gold
  };

  return (
    <div className="rating-scale-container">
      <div className="rating-header">
        <h3>Rate: {foodItemName}</h3>
        <button
          className="info-button"
          onClick={() => setShowInfo(!showInfo)}
          type="button"
        >
          ℹ️
        </button>
      </div>

      {showInfo && (
        <div className="info-box">
          <h4>Rating Scale Guide</h4>
          <div className="info-content">
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#FF0000" }}
              >
                0-10
              </span>
              <span>
                Inedible - Completely unacceptable, harmful, or disgusting
              </span>
            </div>
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#FF8C00" }}
              >
                11-30
              </span>
              <span>Subpar - Poor quality, significant issues</span>
            </div>
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#FFD700" }}
              >
                31-50
              </span>
              <span>Mediocre - Average, nothing special</span>
            </div>
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#90EE90" }}
              >
                51-65
              </span>
              <span>Decent - Acceptable, meets basic expectations</span>
            </div>
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#32CD32" }}
              >
                66-75
              </span>
              <span>Good - Above average, enjoyable</span>
            </div>
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#228B22" }}
              >
                76-85
              </span>
              <span>Very Good - High quality, impressive</span>
            </div>
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#00FF7F" }}
              >
                86-95
              </span>
              <span>Excellent - Outstanding, memorable experience</span>
            </div>
            <div className="info-item">
              <span
                className="score-range"
                style={{ backgroundColor: "#FFD700", color: "#000" }}
              >
                96-100
              </span>
              <span>Masterpiece - Perfect, life-changing experience</span>
            </div>
          </div>
        </div>
      )}

      <div className="gradient-container">
        <div className="gradient-bar">
          <input
            type="range"
            min="0"
            max="100"
            value={rating}
            onChange={(e) => handleRatingChange(e.target.value)}
            className="rating-slider"
          />
        </div>

        <div className="scale-labels">
          <span className="label-item">
            0<br />
            Inedible
          </span>
          <span className="label-item">
            30
            <br />
            Subpar
          </span>
          <span className="label-item">
            50
            <br />
            Mediocre
          </span>
          <span className="label-item">
            65
            <br />
            Decent
          </span>
          <span className="label-item">
            75
            <br />
            Good
          </span>
          <span className="label-item">
            85
            <br />
            Very Good
          </span>
          <span className="label-item">
            95
            <br />
            Excellent
          </span>
          <span className="label-item">
            100
            <br />
            Masterpiece
          </span>
        </div>
      </div>

      <div className="rating-display">
        <span
          className="rating-value"
          style={{ color: getRatingColor(rating) }}
        >
          {rating}/100
        </span>
        <span
          className="rating-label"
          style={{ color: getRatingColor(rating) }}
        >
          {getRatingLabel(rating)}
        </span>
      </div>
    </div>
  );
}

export default RatingScale;
