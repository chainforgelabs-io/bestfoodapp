import React, { useState, useRef, useEffect } from "react";
import { INFO_DATA } from "../utils/standardizedOptions";
import "../styles/InfoTooltip.css";

function InfoTooltip({ option, position = "right" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const info = INFO_DATA[option];

  const handleToggle = () => {
    setIsVisible(!isVisible);
  };

  const handleClickOutside = (event) => {
    if (
      tooltipRef.current &&
      !tooltipRef.current.contains(event.target) &&
      triggerRef.current &&
      !triggerRef.current.contains(event.target)
    ) {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      // Add body scroll lock for mobile
      document.body.classList.add("modal-open");

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.classList.remove("modal-open");
      };
    } else {
      // Remove body scroll lock when tooltip is hidden
      document.body.classList.remove("modal-open");
    }
  }, [isVisible]);

  // Adjust position based on screen size and position
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newPosition = position;

      // Check if tooltip goes off screen and adjust
      if (
        position === "right" &&
        triggerRect.right + tooltipRect.width > viewportWidth - 20
      ) {
        newPosition = "left";
      } else if (
        position === "left" &&
        triggerRect.left - tooltipRect.width < 20
      ) {
        newPosition = "right";
      } else if (
        position === "top" &&
        triggerRect.top - tooltipRect.height < 20
      ) {
        newPosition = "bottom";
      } else if (
        position === "bottom" &&
        triggerRect.bottom + tooltipRect.height > viewportHeight - 20
      ) {
        newPosition = "top";
      }

      setTooltipPosition(newPosition);
    }
  }, [isVisible, position]);

  // Don't render if no info available
  if (!info) return null;

  return (
    <div className="info-tooltip-container">
      <button
        ref={triggerRef}
        type="button"
        className="info-trigger"
        onClick={handleToggle}
        aria-label={`Information about ${option}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8h.01" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {isVisible && (
        <>
          <div
            className="info-tooltip-backdrop"
            onClick={() => setIsVisible(false)}
          />
          <div
            ref={tooltipRef}
            className={`info-tooltip ${tooltipPosition}`}
            role="tooltip"
          >
            <div className="tooltip-header">
              <h4 className="tooltip-title">{option}</h4>
              <button
                className="tooltip-close"
                onClick={() => setIsVisible(false)}
                aria-label="Close tooltip"
              >
                ×
              </button>
            </div>

            <div className="tooltip-content">
              <div className="tooltip-section">
                <p className="tooltip-description">{info.description}</p>
              </div>

              {info.examples && (
                <div className="tooltip-section">
                  <strong className="tooltip-label">Examples:</strong>
                  <p className="tooltip-examples">{info.examples}</p>
                </div>
              )}

              {info.characteristics && (
                <div className="tooltip-section">
                  <strong className="tooltip-label">Characteristics:</strong>
                  <div className="tooltip-characteristics">
                    {info.characteristics.split("\n").map((char, index) => (
                      <div key={index} className="characteristic-item">
                        {char}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InfoTooltip;
