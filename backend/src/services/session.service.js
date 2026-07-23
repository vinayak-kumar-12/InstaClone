const { redisClient, isRedisReady } = require("../config/redis");
const redisKeys = require("../utils/redisKeys");
const logger = require("../utils/logger");

class SessionService {
  /**
   * Saves JWT Refresh Token under `refresh:{userId}:{deviceId}` and updates `session:{userId}` set
   */
  async saveRefreshToken(userId, deviceId, refreshToken, ttlSeconds = 604800) {
    if (!isRedisReady()) return false;
    try {
      const tokenKey = redisKeys.refreshKey(userId, deviceId);
      const userSessionsKey = redisKeys.sessionKey(userId);

      await redisClient.set(tokenKey, refreshToken, { EX: ttlSeconds });
      await redisClient.sAdd(userSessionsKey, deviceId);
      return true;
    } catch (error) {
      logger.error(`SessionService saveRefreshToken Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifies stored refresh token for a user & device
   */
  async verifyRefreshToken(userId, deviceId, refreshToken) {
    if (!isRedisReady()) return true; // Fallback to JWT verify if Redis down
    try {
      const tokenKey = redisKeys.refreshKey(userId, deviceId);
      const storedToken = await redisClient.get(tokenKey);
      return storedToken === refreshToken;
    } catch (error) {
      logger.error(`SessionService verifyRefreshToken Error: ${error.message}`);
      return true;
    }
  }

  /**
   * Revokes a specific device session on logout
   */
  async revokeDeviceSession(userId, deviceId) {
    if (!isRedisReady()) return false;
    try {
      const tokenKey = redisKeys.refreshKey(userId, deviceId);
      const userSessionsKey = redisKeys.sessionKey(userId);

      await redisClient.del(tokenKey);
      await redisClient.sRem(userSessionsKey, deviceId);
      return true;
    } catch (error) {
      logger.error(`SessionService revokeDeviceSession Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Revokes ALL active sessions for a user ("Logout All Devices")
   */
  async revokeAllUserSessions(userId) {
    if (!isRedisReady()) return false;
    try {
      const userSessionsKey = redisKeys.sessionKey(userId);
      const deviceIds = await redisClient.sMembers(userSessionsKey);

      if (deviceIds && deviceIds.length > 0) {
        const tokenKeys = deviceIds.map((dId) => redisKeys.refreshKey(userId, dId));
        await redisClient.del(tokenKeys);
      }
      await redisClient.del(userSessionsKey);
      return true;
    } catch (error) {
      logger.error(`SessionService revokeAllUserSessions Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Returns list of active device IDs for a user
   */
  async getUserActiveSessions(userId) {
    if (!isRedisReady()) return [];
    try {
      const userSessionsKey = redisKeys.sessionKey(userId);
      return await redisClient.sMembers(userSessionsKey);
    } catch (error) {
      logger.error(`SessionService getUserActiveSessions Error: ${error.message}`);
      return [];
    }
  }
}

module.exports = new SessionService();
