const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
noteSchema.index({ tenant: 1, createdAt: -1 });
noteSchema.index({ tenant: 1, author: 1 });
noteSchema.index({ tenant: 1, tags: 1 });

// Ensure notes belong to the same tenant as their author
noteSchema.pre("save", async function (next) {
  if (this.isNew) {
    const User = mongoose.model("User");
    const user = await User.findById(this.author);

    if (!user) {
      return next(new Error("Author not found"));
    }

    if (user.tenant.toString() !== this.tenant.toString()) {
      return next(new Error("Note tenant must match author tenant"));
    }
  }
  next();
});

// Static method to find notes by tenant
noteSchema.statics.findByTenant = function (tenantId, options = {}) {
  return this.find({
    tenant: tenantId,
    isArchived: { $ne: true },
    ...options,
  }).populate("author", "email role");
};

// Method to check if user can modify this note
noteSchema.methods.canModify = function (userId, userRole) {
  // Admins can modify any note in their tenant
  if (userRole === "admin") return true;

  // Members can only modify their own notes
  return this.author.toString() === userId.toString();
};

module.exports = mongoose.model("Note", noteSchema);
