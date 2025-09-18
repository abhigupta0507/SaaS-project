const { validationResult } = require("express-validator");
const Note = require("../models/Note");
const Tenant = require("../models/Tenant");

// @desc    Get all notes for current tenant
// @route   GET /api/notes
// @access  Private (Member+)
const getNotes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      tags,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    let query = { tenant: req.tenant._id, isArchived: false };

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const [notes, totalNotes] = await Promise.all([
      Note.find(query)
        .populate("author", "email role")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Note.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalNotes / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        notes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalNotes,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Private (Member+)
const getNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      tenant: req.tenant._id,
    }).populate("author", "email role");

    if (!note) {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { note },
    });
  } catch (error) {
    console.error("Get note error:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Private (Member+)
const createNote = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    // Check if tenant can create more notes (subscription limit)
    const canCreate = await req.tenant.canCreateNote();
    if (!canCreate) {
      return res.status(403).json({
        error: "Note limit reached for your subscription plan",
        message: "Upgrade to Pro plan for unlimited notes",
        upgradeUrl: `/tenants/${req.tenant.slug}/upgrade`,
      });
    }

    const { title, content, tags = [] } = req.body;

    // Create note
    const note = await Note.create({
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      author: req.user._id,
      tenant: req.tenant._id,
    });

    // Populate author data
    await note.populate("author", "email role");

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: { note },
    });
  } catch (error) {
    console.error("Create note error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private (Member+ - own notes, Admin - all notes)
const updateNote = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      tenant: req.tenant._id,
    }).populate("author", "email role");

    if (!note) {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    // Check if user can modify this note
    if (!note.canModify(req.user._id, req.user.role)) {
      return res.status(403).json({
        error: "Access denied. You can only edit your own notes.",
      });
    }

    const { title, content, tags } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

    // Update note
    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("author", "email role");

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: { note: updatedNote },
    });
  } catch (error) {
    console.error("Update note error:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private (Member+ - own notes, Admin - all notes)
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      tenant: req.tenant._id,
    });

    if (!note) {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    // Check if user can modify this note
    if (!note.canModify(req.user._id, req.user.role)) {
      return res.status(403).json({
        error: "Access denied. You can only delete your own notes.",
      });
    }

    await Note.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// @desc    Get notes statistics
// @route   GET /api/notes/stats
// @access  Private (Member+)
const getNotesStats = async (req, res) => {
  try {
    const [totalNotes, notesByUser, recentNotes] = await Promise.all([
      // Total notes count
      Note.countDocuments({ tenant: req.tenant._id, isArchived: false }),

      // Notes grouped by user
      Note.aggregate([
        { $match: { tenant: req.tenant._id, isArchived: false } },
        { $group: { _id: "$author", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $project: { _id: 0, author: "$user.email", count: 1 } },
      ]),

      // Recent notes (last 7 days)
      Note.countDocuments({
        tenant: req.tenant._id,
        isArchived: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Check subscription limits
    const subscriptionInfo = {
      plan: req.tenant.subscription.plan,
      maxNotes: req.tenant.settings.max_notes,
      currentNotes: totalNotes,
      canCreateMore: await req.tenant.canCreateNote(),
      isPro: req.tenant.isPro,
    };

    res.status(200).json({
      success: true,
      data: {
        totalNotes,
        recentNotes,
        notesByUser,
        subscription: subscriptionInfo,
      },
    });
  } catch (error) {
    console.error("Get notes stats error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

module.exports = {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getNotesStats,
};
