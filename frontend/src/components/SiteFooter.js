// src/components/SiteFooter.js
import React from "react";
import { useLocation } from "react-router-dom";

// Routes that are part of the logged-in app experience; the footer is
// public-page chrome only and shouldn't render inside app flows.
const APP_ROUTE_PREFIXES = [
  "/profile",
  "/users",
  "/submit-review",
  "/add-restaurant",
  "/admin",
];

function SiteFooter() {
  const { pathname } = useLocation();

  if (APP_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <footer className="site-footer">
      <a
        className="site-footer-credit"
        href="https://chainforgelabs.io"
        target="_blank"
        rel="noopener"
      >
        <svg
          viewBox="0 0 32 32"
          width="14"
          height="14"
          fill="currentColor"
          fillRule="evenodd"
          aria-hidden="true"
        >
          <path d="M4 4h24v24H13L4 19Zm4.5 4.5v8.64l6.36 6.36h8.64V8.5Z" />
        </svg>
        Built by Chain Forge Labs
      </a>
    </footer>
  );
}

export default SiteFooter;
