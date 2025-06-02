import React, { useEffect } from "react";
import "../styles/Notification.css";

function Notification({
  message,
  type = "success",
  isVisible,
  onClose,
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
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <span className="notification-icon">
          {type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}
        </span>
        <span className="notification-message">{message}</span>
        <button className="notification-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

export default Notification;
