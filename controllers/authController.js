const { validationResult } = require("express-validator");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const { generateAccessToken } = require("../utils/jwt");

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user by email and populate tenant
    const user = await User.findOne({ email: email.toLowerCase() }).populate(
      "tenant",
      "name slug subscription"
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: "Account is deactivated",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // Generate access token
    const token = generateAccessToken(user);

    // Remove sensitive information
    const userResponse = {
      id: user._id,
      email: user.email,
      role: user.role,
      tenant: {
        id: user.tenant._id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        subscription: user.tenant.subscription,
      },
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      tenant: {
        id: req.tenant._id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        subscription: req.tenant.subscription,
        isPro: req.tenant.isPro,
      },
      createdAt: req.user.createdAt,
    };

    res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Invite user (Admin only)
// @route   POST /api/auth/invite
// @access  Private (Admin)
const inviteUser = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { email, role = "member" } = req.body;

    // Check if user already exists in this tenant
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      tenant: req.tenant._id,
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists in this tenant",
      });
    }

    // Create new user with default password
    const newUser = await User.create({
      email: email.toLowerCase(),
      password: "password", // Default password - should be changed on first login
      role: role,
      tenant: req.tenant._id,
    });

    // Populate tenant data
    await newUser.populate("tenant", "name slug subscription");

    const userResponse = {
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      tenant: {
        id: newUser.tenant._id,
        name: newUser.tenant.name,
        slug: newUser.tenant.slug,
      },
      createdAt: newUser.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "User invited successfully",
      user: userResponse,
      defaultPassword: "password", // In real app, send via email
    });
  } catch (error) {
    console.error("Invite user error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

module.exports = {
  login,
  getProfile,
  inviteUser,
  changePassword,
};
