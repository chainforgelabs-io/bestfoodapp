import React, { useState } from "react";
import "../styles/RatingScale.css";

function RatingScale({ onRatingChange }) {
  const [rating, setRating] = useState(50);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
    onRatingChange(newRating);
  };

  return (
    <div>
      <h3>Rate the Food Item</h3>
      <input
        type="range"
        min="0"
        max="100"
        value={rating}
        onChange={(e) => handleRatingChange(e.target.value)}
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, red, orange, yellow, lightgreen, green)",
        }}
      />
      <p>Rating: {rating}/100</p>
    </div>
  );
}

export default RatingScale;
