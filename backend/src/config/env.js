const logger = require("../utils/logger");

const requiredEnvVars = [
  "PORT",
  "JWT_SECRET",
  "DB_USER",
  "DB_HOST",
  "DB_DATABASE",
  "DB_PASSWORD",
  "DB_PORT",
];

const validateEnv = () => {
  const missing = [];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    logger.error(`Critical configuration error: Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Warn if JWT secrets aren't split for access/refresh
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    logger.warn("Security notice: JWT_ACCESS_SECRET or JWT_REFRESH_SECRET is not set. Falling back to JWT_SECRET.");
  }

  logger.info("Environment variables validated successfully.");
};

module.exports = validateEnv;
