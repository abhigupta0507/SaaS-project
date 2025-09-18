const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate("tenant")
      .select("-password");

    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Account is deactivated." });
    }

    req.user = user;
    req.tenant = user.tenant;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Invalid token." });
  }
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Admin privileges required.",
    });
  }

  next();
};

// Check if user has member role or higher (member or admin)
const requireMember = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!["member", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      error: "Access denied. Member privileges required.",
    });
  }

  next();
};

// Validate tenant access and attach tenant to request
const validateTenant = async (req, res, next) => {
  try {
    const tenantSlug = req.params.slug;

    if (!tenantSlug) {
      return res.status(400).json({ error: "Tenant slug is required." });
    }

    // For authenticated routes, ensure user belongs to the requested tenant
    if (req.user) {
      if (req.user.tenant.slug !== tenantSlug) {
        return res.status(403).json({
          error: "Access denied. You do not belong to this tenant.",
        });
      }
      return next();
    }

    // For non-authenticated routes, just validate tenant exists
    const tenant = await Tenant.findOne({ slug: tenantSlug });
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found." });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error("Tenant validation error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Middleware to ensure all database queries are scoped to user's tenant
const scopeToTenant = (req, res, next) => {
  if (!req.tenant) {
    return res.status(400).json({ error: "Tenant context is required." });
  }

  // Add tenant filter to query helpers
  req.tenantFilter = { tenant: req.tenant._id };
  next();
};

// Rate limiting per tenant
const createTenantRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const rateLimit = require("express-rate-limit");

  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // Create unique key per tenant + IP
      return `${req.tenant?._id || "unknown"}-${req.ip}`;
    },
    message: {
      error: "Too many requests from this tenant. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  authenticate,
  requireAdmin,
  requireMember,
  validateTenant,
  scopeToTenant,
  createTenantRateLimit,
};
