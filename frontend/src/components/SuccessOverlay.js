import React, { useEffect } from "react";
import "../styles/SuccessOverlay.css";

function SuccessOverlay({
  isVisible,
  onClose,
  restaurantName,
  duration = 3000,
}) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="success-overlay">
      <div className="success-content">
        <div className="success-animation">
          <div className="checkmark-circle">
            <div className="checkmark">✓</div>
          </div>
          <div className="success-text">
            <h2>Restaurant Added Successfully!</h2>
            <p>"{restaurantName}" has been added to your location</p>
            <p className="success-subtitle">
              You can now search for it and continue with your review
            </p>
          </div>
        </div>
        <div className="celebration-particles">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SuccessOverlay;
