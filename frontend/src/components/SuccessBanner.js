import React, { useEffect } from "react";
import "../styles/SuccessBanner.css";

function SuccessBanner({ message, isVisible, onClose, duration = 4000 }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  return (
    <div className={`success-banner ${isVisible ? "show" : ""}`}>
      <div className="banner-content">
        <div className="banner-icon">✓</div>
        <span className="banner-message">{message}</span>
        <button className="banner-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

export default SuccessBanner;
