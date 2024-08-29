// src/components/Navbar.js
import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css"; // Import styling if necessary

function Navbar() {
  return (
    <nav>
      <ul>
        <li>
          <NavLink exact to="/">
            Home
          </NavLink>
        </li>

        <li>
          <NavLink to="/feed">Feed</NavLink>
        </li>
        <li>
          <NavLink to="/leaderboards">Leaderboards</NavLink>
        </li>
        <li>
          <NavLink to="/profile">Profile</NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
