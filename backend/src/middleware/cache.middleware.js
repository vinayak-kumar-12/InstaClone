const cacheService = require("../services/cache.service");
const redisKeys = require("../utils/redisKeys");

/**
 * Reusable GET API Caching Middleware
 * @param {Function|String} keyGenerator - Function(req) returning cache key string, or static key pattern
 * @param {Number} ttlSeconds - Expiration time in seconds (default 300s = 5m)
 */
const cacheMiddleware = (keyGenerator, ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Cache GET requests only
    if (req.method !== "GET") {
      return next();
    }

    let key = "";
    if (typeof keyGenerator === "function") {
      key = keyGenerator(req);
    } else if (typeof keyGenerator === "string") {
      key = keyGenerator;
    } else {
      // Default key strategy based on URL path & query string
      const userPart = req.user ? `:user:${req.user.id}` : "";
      key = `cache:${req.originalUrl || req.url}${userPart}`;
    }

    const cachedData = await cacheService.get(key);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cachedData);
    }

    // Intercept res.json to cache response on MISS
    res.setHeader("X-Cache", "MISS");
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200 && body && body.success !== false) {
        cacheService.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Specific Key Invalidation Helpers for Controllers
 */
const invalidateUserCache = async (userId) => {
  await cacheService.del(redisKeys.userKey(userId));
};

const invalidatePostCache = async (postId) => {
  await cacheService.del(redisKeys.postKey(postId));
};

const invalidateFeedCache = async (userId = null) => {
  if (userId) {
    await cacheService.del(redisKeys.feedKey(userId));
  } else {
    await cacheService.delByPattern("feed:*");
  }
};

const invalidateSearchCache = async () => {
  await cacheService.delByPattern("search:*");
};

module.exports = {
  cacheMiddleware,
  invalidateUserCache,
  invalidatePostCache,
  invalidateFeedCache,
  invalidateSearchCache,
};
