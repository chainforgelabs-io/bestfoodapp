import React, { useState, useEffect, useRef } from "react";
import InfoTooltip from "./InfoTooltip";
import { INFO_DATA } from "../utils/standardizedOptions";
import "../styles/StandardizedDropdown.css";

function StandardizedDropdown({
  label,
  placeholder,
  options = [],
  value,
  onChange,
  required = false,
  disabled = false,
  allowMultiple = false,
  maxHeight = "200px",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
    setActiveSuggestion(0);
  }, [searchTerm, options]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm(""); // Clear search term when closing
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev + 1) % filteredOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion(
        (prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleOptionSelect(filteredOptions[activeSuggestion]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      inputRef.current?.blur();
    }
  };

  const handleOptionSelect = (option) => {
    if (allowMultiple) {
      const currentValues = value || [];
      if (currentValues.includes(option)) {
        // Remove if already selected
        onChange(currentValues.filter((v) => v !== option));
      } else {
        // Add to selection
        onChange([...currentValues, option]);
      }
    } else {
      onChange(option);
      setIsOpen(false);
      setSearchTerm("");
      inputRef.current?.blur();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    if (allowMultiple && value) {
      onChange(value.filter((v) => v !== tagToRemove));
    }
  };

  const handleInputClick = (e) => {
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = (e) => {
    if (!disabled && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const displayValue = () => {
    if (allowMultiple) {
      return value && value.length > 0 ? value.join(", ") : "";
    }
    return value || "";
  };

  // Check if the label has info available (for category-level info)
  const hasLabelInfo = label && INFO_DATA[label];

  return (
    <div className="standardized-dropdown" ref={dropdownRef}>
      {label && (
        <label className="dropdown-label">
          {label} {required && <span className="required">*</span>}
          {hasLabelInfo && <InfoTooltip option={label} position="right" />}
        </label>
      )}

      <div className="dropdown-container">
        <div
          className={`dropdown-input-container ${isOpen ? "open" : ""} ${
            disabled ? "disabled" : ""
          }`}
          onClick={handleInputClick}
        >
          {allowMultiple && value && value.length > 0 ? (
            <div className="tag-container">
              {value.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="text"
                className="tag-input"
                placeholder={value.length === 0 ? placeholder : "Add more..."}
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                disabled={disabled}
              />
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              className="dropdown-input"
              placeholder={placeholder}
              value={isOpen ? searchTerm : displayValue()}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              disabled={disabled}
            />
          )}

          <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
        </div>

        {isOpen && !disabled && (
          <div className="dropdown-options" style={{ maxHeight }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option}
                  className={`dropdown-option ${
                    index === activeSuggestion ? "active" : ""
                  } ${
                    allowMultiple && value && value.includes(option)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleOptionSelect(option)}
                >
                  {allowMultiple && value && value.includes(option) && (
                    <span className="option-checkmark">✓</span>
                  )}
                  <span className="option-text">{option}</span>
                  {INFO_DATA[option] && (
                    <InfoTooltip option={option} position="left" />
                  )}
                </div>
              ))
            ) : (
              <div className="dropdown-option disabled">No options found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StandardizedDropdown;
