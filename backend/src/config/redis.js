const { createClient } = require("redis");
const logger = require("../utils/logger");

// Dual-environment host resolution: Service name 'redis' inside Docker, 127.0.0.1 outside Docker
const isDocker = process.env.IS_DOCKER === "true" || process.env.DOCKER_ENV === "true";
const defaultHost = isDocker ? "redis" : "127.0.0.1";
let rawHost = process.env.REDIS_HOST || defaultHost;
if (!isDocker && rawHost === "redis") rawHost = "127.0.0.1";
if (isDocker && (rawHost === "localhost" || rawHost === "127.0.0.1")) rawHost = "redis";

const redisHost = rawHost;
const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisUrl =
  process.env.REDIS_URL && !process.env.REDIS_URL.includes("@redis:")
    ? process.env.REDIS_URL
    : `redis://${redisPassword ? `:${redisPassword}@` : ""}${redisHost}:${redisPort}`;

// Redis Client Configuration with Automatic Reconnect Strategy
const clientOptions = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        logger.error("Redis reconnect attempt limit reached (20). Delaying next attempt...");
        return 5000;
      }
      const delay = Math.min(retries * 200, 3000);
      logger.warn(`Redis reconnecting... Attempt ${retries}, waiting ${delay}ms`);
      return delay;
    },
  },
};

// Singleton Main Client
const redisClient = createClient(clientOptions);

// Pub/Sub Client Duplicates
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

let isReady = false;

// Event Listeners for Lifecycle Events
redisClient.on("connect", () => logger.info(`Redis socket connected to ${redisHost}:${redisPort}`));
redisClient.on("ready", () => {
  isReady = true;
  logger.info("Redis connection established and ready for use.");
});
redisClient.on("error", (err) => {
  isReady = false;
  logger.error(`Redis Client Error: ${err.message}`);
});
redisClient.on("end", () => {
  isReady = false;
  logger.warn("Redis connection closed.");
});

/**
 * Initializes and connects Redis clients (Main, Publisher, Subscriber)
 */
const initRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    if (!pubClient.isOpen) {
      await pubClient.connect();
    }
    if (!subClient.isOpen) {
      await subClient.connect();
    }
  } catch (error) {
    logger.error(`Failed to initialize Redis clients: ${error.message}`);
    // Non-blocking fallback: Log error without crashing Express server
  }
};

/**
 * Returns true if Redis connection is active and ready
 */
const isRedisReady = () => isReady && redisClient.isOpen;

module.exports = {
  redisClient,
  pubClient,
  subClient,
  initRedis,
  isRedisReady,
};
