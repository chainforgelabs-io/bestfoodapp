import React, { useEffect } from "react";
import "../styles/SuccessOverlay.css";

function SuccessOverlay({
  isVisible,
  onClose,
  title = "Success!",
  message = "",
  subtitle = "",
  icon = "✓",
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

  const displayTitle = restaurantName
    ? "Restaurant Added Successfully!"
    : title;
  const displayMessage = restaurantName
    ? `"${restaurantName}" has been added to your location`
    : message;
  const displaySubtitle = restaurantName
    ? "You can now search for it and continue with your review"
    : subtitle;
  const displayIcon = restaurantName ? "✓" : icon;

  return (
    <div className="success-overlay">
      <div className="success-content">
        <div className="success-animation">
          <div className="checkmark-circle">
            <div className="checkmark">{displayIcon}</div>
          </div>
          <div className="success-text">
            <h2>{displayTitle}</h2>
            {displayMessage && <p>{displayMessage}</p>}
            {displaySubtitle && (
              <p className="success-subtitle">{displaySubtitle}</p>
            )}
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
