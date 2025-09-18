const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Note = require("../models/Note");

// @desc    Get tenant information
// @route   GET /api/tenants/:slug
// @access  Private (Member+)
const getTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug });

    if (!tenant) {
      return res.status(404).json({
        error: "Tenant not found",
      });
    }

    // Get additional stats
    const [totalUsers, totalNotes] = await Promise.all([
      User.countDocuments({ tenant: tenant._id, isActive: true }),
      Note.countDocuments({ tenant: tenant._id, isArchived: false }),
    ]);

    const tenantInfo = {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      subscription: tenant.subscription,
      settings: tenant.settings,
      isPro: tenant.isPro,
      stats: {
        totalUsers,
        totalNotes,
        canCreateNotes: await tenant.canCreateNote(),
      },
      createdAt: tenant.createdAt,
    };

    res.status(200).json({
      success: true,
      data: { tenant: tenantInfo },
    });
  } catch (error) {
    console.error("Get tenant error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Upgrade tenant subscription to Pro
// @route   POST /api/tenants/:slug/upgrade
// @access  Private (Admin only)
const upgradeTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug });

    if (!tenant) {
      return res.status(404).json({
        error: "Tenant not found",
      });
    }

    // Check if user belongs to this tenant and is admin
    if (req.user.tenant._id.toString() !== tenant._id.toString()) {
      return res.status(403).json({
        error: "Access denied. You can only upgrade your own tenant.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        error:
          "Access denied. Admin privileges required for subscription upgrades.",
      });
    }

    // Check if already on Pro plan
    if (tenant.subscription.plan === "pro") {
      return res.status(400).json({
        error: "Tenant is already on Pro plan",
      });
    }

    // Upgrade to Pro
    await tenant.upgradeToPro();

    const upgradedTenant = {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      subscription: tenant.subscription,
      settings: tenant.settings,
      isPro: tenant.isPro,
    };

    res.status(200).json({
      success: true,
      message: "Successfully upgraded to Pro plan",
      data: { tenant: upgradedTenant },
    });
  } catch (error) {
    console.error("Upgrade tenant error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Get tenant users
// @route   GET /api/tenants/:slug/users
// @access  Private (Admin only)
const getTenantUsers = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug });

    if (!tenant) {
      return res.status(404).json({
        error: "Tenant not found",
      });
    }

    // Check if user belongs to this tenant and is admin
    if (req.user.tenant._id.toString() !== tenant._id.toString()) {
      return res.status(403).json({
        error: "Access denied. You can only view users in your own tenant.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied. Admin privileges required.",
      });
    }

    const { page = 1, limit = 10, role, status = "active" } = req.query;

    // Build query
    let query = { tenant: tenant._id };

    if (role) {
      query.role = role;
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get tenant users error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Update user role in tenant
// @route   PUT /api/tenants/:slug/users/:userId/role
// @access  Private (Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be admin or member.",
      });
    }

    const tenant = await Tenant.findOne({ slug: req.params.slug });

    if (!tenant) {
      return res.status(404).json({
        error: "Tenant not found",
      });
    }

    // Check if user belongs to this tenant and is admin
    if (req.user.tenant._id.toString() !== tenant._id.toString()) {
      return res.status(403).json({
        error: "Access denied. You can only manage users in your own tenant.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied. Admin privileges required.",
      });
    }

    // Find the user to update
    const userToUpdate = await User.findOne({
      _id: req.params.userId,
      tenant: tenant._id,
    });

    if (!userToUpdate) {
      return res.status(404).json({
        error: "User not found in this tenant",
      });
    }

    // Prevent self-demotion (admin can't remove their own admin role)
    if (
      userToUpdate._id.toString() === req.user._id.toString() &&
      role !== "admin"
    ) {
      return res.status(400).json({
        error: "You cannot remove your own admin privileges",
      });
    }

    // Update user role
    userToUpdate.role = role;
    await userToUpdate.save();

    const updatedUser = {
      id: userToUpdate._id,
      email: userToUpdate.email,
      role: userToUpdate.role,
      isActive: userToUpdate.isActive,
      createdAt: userToUpdate.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Deactivate user in tenant
// @route   DELETE /api/tenants/:slug/users/:userId
// @access  Private (Admin only)
const deactivateUser = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug });

    if (!tenant) {
      return res.status(404).json({
        error: "Tenant not found",
      });
    }

    // Check permissions
    if (
      req.user.tenant._id.toString() !== tenant._id.toString() ||
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        error: "Access denied. Admin privileges required.",
      });
    }

    const userToDeactivate = await User.findOne({
      _id: req.params.userId,
      tenant: tenant._id,
    });

    if (!userToDeactivate) {
      return res.status(404).json({
        error: "User not found in this tenant",
      });
    }

    // Prevent self-deactivation
    if (userToDeactivate._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        error: "You cannot deactivate your own account",
      });
    }

    // Deactivate user
    userToDeactivate.isActive = false;
    await userToDeactivate.save();

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

module.exports = {
  getTenant,
  upgradeTenant,
  getTenantUsers,
  updateUserRole,
  deactivateUser,
};
