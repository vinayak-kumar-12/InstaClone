const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const express = require("express");
const { AppError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * Configure Helmet middleware for secure HTTP headers.
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"], // Cloudinary images
      connectSrc: ["'self'", "wss:", "https:"], // For Socket.io
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: "deny" }, // Prevent Clickjacking (Frame Guard)
  xssFilter: true, // XSS Filter header
  noSniff: true, // Prevent MIME-type sniffing
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

/**
 * Configure CORS middleware
 */
const corsOptions = {
  origin: (origin, callback) => {
    // If running in development and no origin is set (e.g. tools like Postman/curl), allow it.
    if (!origin && process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : ["http://localhost:5173", "http://localhost:3000"];

    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      logger.security("Blocked by CORS", { origin });
      callback(new AppError("Blocked by CORS policy.", 403));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Request-Id",
  ],
  exposedHeaders: ["X-Request-Id"],
};

const corsMiddleware = cors(corsOptions);

/**
 * Middleware to append a unique request ID to each request
 */
const requestIdMiddleware = (req, res, next) => {
  // Simple unique ID generator
  const reqId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  req.id = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
};

/**
 * Middleware to measure and log request response times
 */
const responseTimeLoggerMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    // Log using structured logger, omitting password/token fields
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${timeInMs}ms)`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: parseFloat(timeInMs),
      requestId: req.id,
      ip: req.ip || req.headers["x-forwarded-for"],
    });
  });

  next();
};

/**
 * Limit parser size to protect against body/payload size exhaustion attacks.
 */
const jsonLimitMiddleware = express.json({ limit: "10kb" });
const urlencodedLimitMiddleware = express.urlencoded({ extended: true, limit: "10kb" });

const compressionMiddleware = compression();
const cookieParserMiddleware = cookieParser();

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  requestIdMiddleware,
  responseTimeLoggerMiddleware,
  jsonLimitMiddleware,
  urlencodedLimitMiddleware,
  compressionMiddleware,
  cookieParserMiddleware,
};
