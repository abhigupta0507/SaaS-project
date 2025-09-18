const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "pro"],
        default: "free",
      },
      upgraded_at: {
        type: Date,
      },
    },
    settings: {
      max_notes: {
        type: Number,
        default: 3, // Free plan limit
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
tenantSchema.index({ slug: 1 });

// Virtual for checking if tenant is on pro plan
tenantSchema.virtual("isPro").get(function () {
  return this.subscription.plan === "pro";
});

// Method to upgrade tenant to pro
tenantSchema.methods.upgradeToPro = function () {
  this.subscription.plan = "pro";
  this.subscription.upgraded_at = new Date();
  this.settings.max_notes = -1; // -1 means unlimited
  return this.save();
};

// Method to check if tenant can create more notes
tenantSchema.methods.canCreateNote = async function () {
  if (this.subscription.plan === "pro") return true;

  // Count current notes for this tenant
  const Note = mongoose.model("Note");
  const noteCount = await Note.countDocuments({ tenant: this._id });

  return noteCount < this.settings.max_notes;
};

module.exports = mongoose.model("Tenant", tenantSchema);
