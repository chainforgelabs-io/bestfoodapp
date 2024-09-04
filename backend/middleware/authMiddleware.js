const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect routes and ensure the user is authenticated
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error("Token verification failed:", error);
      return res.status(401).json({ msg: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ msg: "Not authorized, no token" });
  }
};

// Middleware to check if the user is an admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next(); // User is an admin, so proceed to the next middleware or route handler
  } else {
    res.status(403).json({ message: "Admin access required" }); // User is not an admin, so deny access
  }
};

module.exports = { protect, admin };
