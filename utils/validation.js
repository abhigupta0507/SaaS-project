const { body, param, query } = require("express-validator");

// Common validation rules
const emailValidation = () =>
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address");

const passwordValidation = () =>
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long");

const roleValidation = () =>
  body("role")
    .optional()
    .isIn(["admin", "member"])
    .withMessage("Role must be either admin or member");

const tenantSlugValidation = () =>
  param("slug")
    .isSlug()
    .withMessage(
      "Tenant slug must be a valid slug (lowercase letters, numbers, and hyphens only)"
    );

const noteValidation = () => [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title is required and must be less than 200 characters"),
  body("content")
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage("Content is required and must be less than 10000 characters"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .custom((tags) => {
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          if (typeof tag !== "string" || tag.trim().length === 0) {
            throw new Error("Each tag must be a non-empty string");
          }
          if (tag.length > 50) {
            throw new Error("Each tag must be less than 50 characters");
          }
        }
      }
      return true;
    }),
];

const paginationValidation = () => [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const searchValidation = () => [
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query must be less than 100 characters"),
  query("tags")
    .optional()
    .custom((value) => {
      if (typeof value !== "string") return true;
      const tags = value.split(",");
      if (tags.length > 10) {
        throw new Error("Maximum 10 tags allowed in filter");
      }
      return true;
    }),
];

const sortValidation = () => [
  query("sortBy")
    .optional()
    .isIn(["createdAt", "updatedAt", "title"])
    .withMessage("sortBy must be one of: createdAt, updatedAt, title"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be either asc or desc"),
];

module.exports = {
  emailValidation,
  passwordValidation,
  roleValidation,
  tenantSlugValidation,
  noteValidation,
  paginationValidation,
  searchValidation,
  sortValidation,
};
