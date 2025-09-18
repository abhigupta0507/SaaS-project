const express = require("express");
const { body } = require("express-validator");
const {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getNotesStats,
} = require("../controllers/noteController");
const { authenticate, requireMember } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication and member role or higher
router.use(authenticate);
router.use(requireMember);

// @route   GET /api/notes/stats
// @desc    Get notes statistics
// @access  Private (Member+)
router.get("/stats", getNotesStats);

// @route   GET /api/notes
// @desc    Get all notes for current tenant
// @access  Private (Member+)
router.get("/", getNotes);

// @route   POST /api/notes
// @desc    Create new note
// @access  Private (Member+)
router.post(
  "/",
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title is required and must be less than 200 characters"),
    body("content")
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage(
        "Content is required and must be less than 10000 characters"
      ),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
  ],
  createNote
);

// @route   GET /api/notes/:id
// @desc    Get single note
// @access  Private (Member+)
router.get("/:id", getNote);

// @route   PUT /api/notes/:id
// @desc    Update note
// @access  Private (Member+ - own notes, Admin - all notes)
router.put(
  "/:id",
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title must be less than 200 characters"),
    body("content")
      .optional()
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage("Content must be less than 10000 characters"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
  ],
  updateNote
);

// @route   DELETE /api/notes/:id
// @desc    Delete note
// @access  Private (Member+ - own notes, Admin - all notes)
router.delete("/:id", deleteNote);

module.exports = router;
