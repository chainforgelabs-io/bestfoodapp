import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import Logo from "../assets/logo.png";
import "../styles/Navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
      <div className="nav-container">
        {/* Logo/Brand */}
        <div className="nav-brand">
          <NavLink to="/" onClick={closeMenu} className="brand-link">
            <img src={Logo} alt="Best Food App Logo" className="nav-logo" />
            <span className="brand-text">Best Food App</span>
          </NavLink>
        </div>

        {/* Desktop Navigation */}
        <ul className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
          <li className="nav-item">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">🏠</span>
              Home
            </NavLink>
          </li>
          {/* <li>
            <NavLink to="/feed">Feed</NavLink>
          </li> */}
          <li className="nav-item">
            <NavLink
              to="/leaderboards"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">🏆</span>
              Leaderboards
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/map"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">🧭</span>
              Map
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/scoring-criteria"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">📏</span>
              Scoring
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">👤</span>
              Profile
            </NavLink>
          </li>
        </ul>

        {/* Mobile Hamburger Menu */}
        <div
          className={`hamburger ${isMenuOpen ? "active" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && <div className="nav-overlay" onClick={closeMenu}></div>}
    </nav>
  );
}

export default Navbar;
