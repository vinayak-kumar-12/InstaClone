const { redisClient, isRedisReady } = require("../config/redis");
const logger = require("../utils/logger");

/**
 * High-Level Redis Caching Service
 * Provides robust, non-blocking JSON caching with fallback
 */
class CacheService {
  /**
   * Retrieves and parses JSON cache data
   */
  async get(key) {
    if (!isRedisReady()) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`CacheService GET Error [key: ${key}]: ${error.message}`);
      return null;
    }
  }

  /**
   * Serializes and sets JSON cache data with optional TTL (seconds)
   */
  async set(key, value, ttlSeconds = 300) {
    if (!isRedisReady()) return false;
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(key, payload, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, payload);
      }
      return true;
    } catch (error) {
      logger.error(`CacheService SET Error [key: ${key}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Deletes a specific cache key
   */
  async del(key) {
    if (!isRedisReady()) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`CacheService DEL Error [key: ${key}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Deletes all keys matching a wildcard pattern (e.g. "feed:*") using SCAN
   */
  async delByPattern(pattern) {
    if (!isRedisReady()) return false;
    try {
      let cursor = 0;
      const keysToDelete = [];
      do {
        const reply = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = reply.cursor;
        keysToDelete.push(...reply.keys);
      } while (cursor !== 0);

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
      }
      return true;
    } catch (error) {
      logger.error(`CacheService delByPattern Error [pattern: ${pattern}]: ${error.message}`);
      return false;
    }
  }
}

module.exports = new CacheService();
