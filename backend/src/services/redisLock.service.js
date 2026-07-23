const { redisClient, isRedisReady } = require("../config/redis");
const redisKeys = require("../utils/redisKeys");
const logger = require("../utils/logger");
const crypto = require("crypto");

class RedisLockService {
  /**
   * Acquires a distributed lock using `SET key value NX PX ttlMs`
   * @param {String} resource - Identifier (e.g. `like:post_123:user_45`)
   * @param {String} action - Action type
   * @param {Number} ttlMs - Lock TTL in milliseconds (default 5000ms = 5s)
   * @returns {Promise<String|null>} - Returns lock identifier token if acquired, else null
   */
  async acquireLock(resource, action = "action", ttlMs = 5000) {
    if (!isRedisReady()) return "fallback_lock_token";
    try {
      const key = redisKeys.lockKey(resource, action);
      const token = crypto.randomBytes(16).toString("hex");

      const result = await redisClient.set(key, token, {
        NX: true,
        PX: ttlMs,
      });

      return result === "OK" ? token : null;
    } catch (error) {
      logger.error(`RedisLockService acquireLock Error [resource: ${resource}]: ${error.message}`);
      return "fallback_lock_token";
    }
  }

  /**
   * Releases a distributed lock atomically using Lua script to verify ownership token
   * @param {String} resource
   * @param {String} action
   * @param {String} token
   */
  async releaseLock(resource, action = "action", token = null) {
    if (!isRedisReady() || !token || token === "fallback_lock_token") return true;
    try {
      const key = redisKeys.lockKey(resource, action);

      // Lua Script to check token before deleting
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      await redisClient.eval(luaScript, {
        keys: [key],
        arguments: [token],
      });
      return true;
    } catch (error) {
      logger.error(`RedisLockService releaseLock Error [resource: ${resource}]: ${error.message}`);
      return false;
    }
  }
}

module.exports = new RedisLockService();
