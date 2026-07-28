import React, { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Flame,
  CirclePlus,
  Trophy,
  Map as MapIcon,
  Star,
  User,
  Share2,
} from "lucide-react";
import Logo from "../assets/logo.png";
import "../styles/Navbar.css";
import axios from "../api/axios";
import tokenUtils, { AUTH_CHANGED_EVENT } from "../utils/auth";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshAdminStatus = useCallback(() => {
    if (!tokenUtils.isAuthenticated()) {
      setIsAdmin(false);
      return;
    }
    axios
      .get("/users/profile")
      .then((res) => setIsAdmin(res.data?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  // Handle scroll effect for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    refreshAdminStatus();
    window.addEventListener(AUTH_CHANGED_EVENT, refreshAdminStatus);
    return () =>
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshAdminStatus);
  }, [refreshAdminStatus]);

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
              <span className="nav-icon">
                <Home size={22} strokeWidth={2} aria-hidden />
              </span>
              Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/feed"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">
                <Flame size={22} strokeWidth={2} aria-hidden />
              </span>
              Feed
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/submit-review/scan"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">
                <CirclePlus size={22} strokeWidth={2} aria-hidden />
              </span>
              Submit
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/leaderboards"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">
                <Trophy size={22} strokeWidth={2} aria-hidden />
              </span>
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
              <span className="nav-icon">
                <MapIcon size={22} strokeWidth={2} aria-hidden />
              </span>
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
              <span className="nav-icon">
                <Star size={22} strokeWidth={2} aria-hidden />
              </span>
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
              <span className="nav-icon">
                <User size={22} strokeWidth={2} aria-hidden />
              </span>
              Profile
            </NavLink>
          </li>
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/social"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
                onClick={closeMenu}
              >
                <span className="nav-icon">
                  <Share2 size={22} strokeWidth={2} aria-hidden />
                </span>
                Social
              </NavLink>
            </li>
          )}
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
