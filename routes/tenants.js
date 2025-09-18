const express = require("express");
const {
  getTenant,
  upgradeTenant,
  getTenantUsers,
  updateUserRole,
  deactivateUser,
} = require("../controllers/tenantController");
const {
  authenticate,
  requireAdmin,
  requireMember,
  validateTenant,
} = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/tenants/:slug
// @desc    Get tenant information
// @access  Private (Member+)
router.get("/:slug", authenticate, requireMember, validateTenant, getTenant);

// @route   POST /api/tenants/:slug/upgrade
// @desc    Upgrade tenant subscription to Pro
// @access  Private (Admin only)
router.post(
  "/:slug/upgrade",
  authenticate,
  requireAdmin,
  validateTenant,
  upgradeTenant
);

// @route   GET /api/tenants/:slug/users
// @desc    Get tenant users
// @access  Private (Admin only)
router.get(
  "/:slug/users",
  authenticate,
  requireAdmin,
  validateTenant,
  getTenantUsers
);

// @route   PUT /api/tenants/:slug/users/:userId/role
// @desc    Update user role in tenant
// @access  Private (Admin only)
router.put(
  "/:slug/users/:userId/role",
  authenticate,
  requireAdmin,
  validateTenant,
  updateUserRole
);

// @route   DELETE /api/tenants/:slug/users/:userId
// @desc    Deactivate user in tenant
// @access  Private (Admin only)
router.delete(
  "/:slug/users/:userId",
  authenticate,
  requireAdmin,
  validateTenant,
  deactivateUser
);

module.exports = router;
