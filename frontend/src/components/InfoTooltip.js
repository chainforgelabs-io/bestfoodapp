import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { INFO_DATA } from "../utils/standardizedOptions";
import "../styles/InfoTooltip.css";

function InfoTooltip({ option, position = "right" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const [triggerRect, setTriggerRect] = useState(null);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const info = INFO_DATA[option];

  const handleToggle = () => {
    if (!isVisible && triggerRef.current) {
      // Store trigger position when opening tooltip
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerRect(rect);
    }
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
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isVisible]);

  // Adjust position based on screen size and position
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRect) {
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
  }, [isVisible, position, triggerRect]);

  // Calculate tooltip positioning
  const getTooltipStyle = () => {
    if (!triggerRect) return {};

    const offset = 8;
    let style = {
      position: "fixed",
      zIndex: 2147483648, // Higher than modal
    };

    switch (tooltipPosition) {
      case "right":
        style.left = triggerRect.right + offset;
        style.top = triggerRect.top + triggerRect.height / 2;
        style.transform = "translateY(-50%)";
        break;
      case "left":
        style.right = window.innerWidth - triggerRect.left + offset;
        style.top = triggerRect.top + triggerRect.height / 2;
        style.transform = "translateY(-50%)";
        break;
      case "top":
        style.left = triggerRect.left + triggerRect.width / 2;
        style.bottom = window.innerHeight - triggerRect.top + offset;
        style.transform = "translateX(-50%)";
        break;
      case "bottom":
        style.left = triggerRect.left + triggerRect.width / 2;
        style.top = triggerRect.bottom + offset;
        style.transform = "translateX(-50%)";
        break;
      default:
        style.left = triggerRect.right + offset;
        style.top = triggerRect.top + triggerRect.height / 2;
        style.transform = "translateY(-50%)";
    }

    return style;
  };

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

      {isVisible &&
        ReactDOM.createPortal(
          <>
            <div
              className="info-tooltip-backdrop"
              onClick={() => setIsVisible(false)}
            />
            <div
              ref={tooltipRef}
              className={`info-tooltip ${tooltipPosition}`}
              style={getTooltipStyle()}
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
          </>,
          document.body
        )}
    </div>
  );
}

export default InfoTooltip;
