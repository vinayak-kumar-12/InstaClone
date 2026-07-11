const { body, param, query, validationResult } = require("express-validator");
const { ValidationError } = require("../utils/errors");

/**
 * Validation runner middleware. Checks the result of express-validator checks,
 * and if errors exist, throws a ValidationError.
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    next(new ValidationError("Request validation failed", formattedErrors));
  };
};

/**
 * Password strength policy:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const passwordPolicy = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters long")
  .matches(/[A-Z]/)
  .withMessage("Password must contain at least one uppercase letter")
  .matches(/[a-z]/)
  .withMessage("Password must contain at least one lowercase letter")
  .matches(/[0-9]/)
  .withMessage("Password must contain at least one number")
  .matches(/[\W_]/)
  .withMessage("Password must contain at least one special character");

const validateSignup = validate([
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address format")
    .normalizeEmail({ gmail_remove_dots: false }), // Normalize but don't break subaddressing or dots

  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_.]+$/)
    .withMessage("Username can only contain alphanumeric characters, underscores, and dots")
    .toLowerCase(), // Normalize to lowercase

  passwordPolicy,
]);

const validateLogin = validate([
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address format")
    .normalizeEmail({ gmail_remove_dots: false }),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
]);

const validateUpdateProfile = validate([
  body("name")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Name cannot exceed 50 characters")
    .escape(), // Escape HTML characters

  body("bio")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Bio cannot exceed 150 characters")
    .escape(),
]);

const validateIntegerParam = (paramName) => 
  validate([
    param(paramName)
      .isInt({ min: 1 })
      .withMessage(`Parameter ${paramName} must be a positive integer`),
  ]);

const validateUUIDParam = (paramName) =>
  validate([
    param(paramName)
      .isUUID()
      .withMessage(`Parameter ${paramName} must be a valid UUID`),
  ]);

module.exports = {
  validateSignup,
  validateLogin,
  validateUpdateProfile,
  validateIntegerParam,
  validateUUIDParam,
  validate,
};
