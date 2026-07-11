const logger = require("../utils/logger");
const { AppError } = require("../utils/errors");

const handlePostgresError = (err) => {
  // Handle unique constraint violations
  if (err.code === "23505") {
    // Extract key detail from pg error message
    // e.g., Key (email)=(test@example.com) already exists.
    let detail = err.detail || "";
    let field = "Resource";
    const match = detail.match(/\((.*?)\)=\((.*?)\)/);
    if (match) {
      field = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
    return new AppError(`${field} already exists.`, 409);
  }
  // Foreign key violations
  if (err.code === "23503") {
    return new AppError("Invalid reference key in database.", 400);
  }
  // Invalid text representation (e.g. malformed UUID or integer type casting)
  if (err.code === "22P02") {
    return new AppError("Invalid database input format.", 400);
  }
  return new AppError("Database error occurred.", 500);
};

const handleJWTError = () => new AppError("Invalid token. Please log in again.", 401);
const handleJWTExpiredError = () => new AppError("Token expired. Please log in again.", 401);

const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.errors = err.errors || [];

  // Parse raw postgres errors
  if (err.code || err.severity) {
    error = handlePostgresError(err);
  }

  // Parse JWT errors
  if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }
  if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  const isProduction = process.env.NODE_ENV === "production";

  // Log error using structured logger
  const logMeta = {
    method: req.method,
    url: req.originalUrl,
    requestId: req.id,
    userId: req.user ? req.user.id : null,
    statusCode: error.statusCode,
  };

  if (error.statusCode >= 500) {
    logger.error(err.message || "Server Error", { ...logMeta, stack: err.stack });
  } else {
    logger.warn(`Client Error: ${error.message}`, { ...logMeta, errors: error.errors });
  }

  // Standardized response format
  res.status(error.statusCode).json({
    success: false,
    message: error.message || "An unexpected error occurred.",
    errors: error.errors.length > 0 ? error.errors : [error.message],
    // Only return stack in development/testing, never in production
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = globalErrorHandler;
