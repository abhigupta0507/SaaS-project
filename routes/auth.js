const express = require("express");
const { body } = require("express-validator");
const {
  login,
  getProfile,
  inviteUser,
  changePassword,
} = require("../controllers/authController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  login
);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", authenticate, getProfile);

// @route   POST /api/auth/invite
// @desc    Invite user (Admin only)
// @access  Private (Admin)
router.post(
  "/invite",
  [
    authenticate,
    requireAdmin,
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("role")
      .optional()
      .isIn(["admin", "member"])
      .withMessage("Role must be either admin or member"),
  ],
  inviteUser
);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put(
  "/password",
  [
    authenticate,
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long"),
  ],
  changePassword
);

module.exports = router;
