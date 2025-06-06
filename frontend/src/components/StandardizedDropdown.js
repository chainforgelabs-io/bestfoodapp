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
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [customOptions, setCustomOptions] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const customInputRef = useRef(null);

  // Combine original options with custom options, keeping "Add +" at the end
  const allOptions = React.useMemo(() => {
    const baseOptions = options.filter((opt) => opt !== "Add +");
    return [...baseOptions, ...customOptions, "Add +"];
  }, [options, customOptions]);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOptions(allOptions);
    } else {
      const filtered = allOptions.filter((option) =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
    setActiveSuggestion(0);
  }, [searchTerm, allOptions]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm(""); // Clear search term when closing
        setShowCustomInput(false);
        setCustomInputValue("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Focus custom input when it appears
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (showCustomInput) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCustomSubmit();
      } else if (e.key === "Escape") {
        setShowCustomInput(false);
        setCustomInputValue("");
      }
      return;
    }

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
    if (option === "Add +") {
      setShowCustomInput(true);
      setCustomInputValue("");
      return;
    }

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

  const handleCustomSubmit = () => {
    const trimmedValue = customInputValue.trim();
    if (trimmedValue && !allOptions.includes(trimmedValue)) {
      // Add to custom options
      setCustomOptions((prev) => [...prev, trimmedValue]);

      // Select the new custom option
      if (allowMultiple) {
        const currentValues = value || [];
        onChange([...currentValues, trimmedValue]);
      } else {
        onChange(trimmedValue);
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    setShowCustomInput(false);
    setCustomInputValue("");
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
            {showCustomInput ? (
              <div className="custom-input-container">
                <input
                  ref={customInputRef}
                  type="text"
                  className="custom-input"
                  placeholder="Enter custom option..."
                  value={customInputValue}
                  onChange={(e) => setCustomInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="custom-input-buttons">
                  <button
                    type="button"
                    className="custom-submit-btn"
                    onClick={handleCustomSubmit}
                    disabled={!customInputValue.trim()}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="custom-cancel-btn"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomInputValue("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option}
                  className={`dropdown-option ${
                    index === activeSuggestion ? "active" : ""
                  } ${
                    allowMultiple && value && value.includes(option)
                      ? "selected"
                      : ""
                  } ${option === "Add +" ? "add-option" : ""}`}
                  onClick={() => handleOptionSelect(option)}
                >
                  {allowMultiple &&
                    value &&
                    value.includes(option) &&
                    option !== "Add +" && (
                      <span className="option-checkmark">✓</span>
                    )}
                  <span className="option-text">
                    {option === "Add +" ? (
                      <>
                        <span className="add-icon">+</span>
                        Add custom option
                      </>
                    ) : (
                      option
                    )}
                  </span>
                  {INFO_DATA[option] && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <InfoTooltip option={option} position="left" />
                    </div>
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
