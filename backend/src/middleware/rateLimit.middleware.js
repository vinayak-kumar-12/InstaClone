const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const { AppError } = require("../utils/errors");

// Helper to standardise limit reached response
const limitHandler = (message) => {
  return (req, res, next, options) => {
    next(new AppError(message, 429));
  };
};

/**
 * Global API rate limiter - protects server from general DDoS and spamming
 */
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000;
const windowMin = Math.round(windowMs / 60000) || 1;
const limitMessage = `Too many requests, please try again after ${windowMin} minute${windowMin !== 1 ? "s" : ""}.`;

const globalLimiter = rateLimit({
  windowMs,
  max,
  message: limitMessage,
  handler: limitHandler(limitMessage),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Login Rate Limiter - blocks brute-force on passwords
 * Max 5 failed login attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 attempts (including successful logins) to be safe
  message: "Too many login attempts from this IP, please try again after 15 minutes.",
  handler: limitHandler("Too many login attempts, please try again after 15 minutes."),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Signup Rate Limiter - prevents automated spam account creation
 * Max 5 accounts created per hour per IP
 */
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,
  message: "Too many accounts created from this IP, please try again after an hour.",
  handler: limitHandler("Too many signups from this IP, please try again after an hour."),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Login Slow Down Middleware - introduces progressive delay after multiple attempts.
 * Delays responses by 500ms per attempt after the 3rd attempt within a 15 min window,
 * capping the maximum delay at 2000ms.
 */
const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 3, // Begin slowing down after the 3rd request
  delayMs: (hits) => hits * 500, // Add 500ms delay per request above threshold
  maxDelayMs: 2000, // Cap delay at 2 seconds
});

module.exports = {
  globalLimiter,
  loginLimiter,
  signupLimiter,
  loginSlowDown,
};
