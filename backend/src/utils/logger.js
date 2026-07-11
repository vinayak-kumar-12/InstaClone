const path = require("path");

const IS_PRODUCTION = process.env.NODE_ENV === "production";


 // Helper to sanitize log data by stripping passwords, tokens, etc.

const sanitize = (data) => {
  if (!data) return data;
  if (typeof data !== "object") return data;

  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = ["password", "token", "accessToken", "refreshToken", "jwt", "authorization"];

  for (const key in sanitized) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }
  return sanitized;
};

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitize(meta);

  if (IS_PRODUCTION) {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...sanitizedMeta,
    });
  } else {
    const metaString = Object.keys(sanitizedMeta).length 
      ? ` | ${JSON.stringify(sanitizedMeta)}` 
      : "";
    const colors = {
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
      debug: "\x1b[36m", // Cyan
      reset: "\x1b[0m"
    };
    const color = colors[level] || colors.reset;
    return `[${timestamp}] ${color}${level.toUpperCase()}${colors.reset}: ${message}${metaString}`;
  }
};

const logger = {
  info: (message, meta) => {
    console.log(formatMessage("info", message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage("warn", message, meta));
  },
  error: (message, meta) => {
    console.error(formatMessage("error", message, meta));
  },
  debug: (message, meta) => {
    if (!IS_PRODUCTION) {
      console.log(formatMessage("debug", message, meta));
    }
  },
  security: (message, meta) => {
    console.warn(formatMessage("warn", `[SECURITY-EVENT] ${message}`, { ...meta, securityEvent: true }));
  }
};

module.exports = logger;
