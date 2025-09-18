const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "notes-saas",
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

// Generate access token for user
const generateAccessToken = (user) => {
  return generateToken({
    userId: user._id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant._id || user.tenant,
    tenantSlug: user.tenant.slug || user.tenant,
  });
};

// Extract token from request header
const extractToken = (req) => {
  const authHeader = req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  generateAccessToken,
  extractToken,
};
