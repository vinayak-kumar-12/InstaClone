const { redisClient, isRedisReady } = require("../config/redis");
const redisKeys = require("../utils/redisKeys");
const logger = require("../utils/logger");

/**
 * Redis-based Sliding Window Rate Limiting Middleware
 * @param {String} routeName - Name identifier for the endpoint group (e.g. "login", "comments", "likes")
 * @param {Number} maxRequests - Max requests allowed within window (default 10)
 * @param {Number} windowSeconds - Time window in seconds (default 60s)
 */
const redisRateLimit = (routeName, maxRequests = 10, windowSeconds = 60) => {
  return async (req, res, next) => {
    if (!isRedisReady()) {
      // Fallback: Allow request if Redis is unavailable
      return next();
    }

    try {
      const identifier = req.user ? `user:${req.user.id}` : `ip:${req.ip || req.connection.remoteAddress}`;
      const key = redisKeys.rateLimitKey(identifier, routeName);

      const currentCount = await redisClient.incr(key);

      if (currentCount === 1) {
        // Set window expiration on first request
        await redisClient.expire(key, windowSeconds);
      }

      const ttl = await redisClient.ttl(key);
      const retryAfter = ttl > 0 ? ttl : windowSeconds;

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - currentCount));

      if (currentCount > maxRequests) {
        res.setHeader("Retry-After", retryAfter);

        return res.status(429).json({
          success: false,
          message: "Too many requests. Please slow down and try again later.",
          retryAfterSeconds: retryAfter,
        });
      }

      next();
    } catch (error) {
      logger.error(`redisRateLimit Middleware Error [route: ${routeName}]: ${error.message}`);
      next(); // Non-blocking fallback
    }
  };
};

module.exports = redisRateLimit;
