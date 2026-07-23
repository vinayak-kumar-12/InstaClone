const { redisClient, pubClient, subClient, isRedisReady } = require("../config/redis");
const redisKeys = require("../utils/redisKeys");
const logger = require("../utils/logger");

class PubSubService {
  /**
   * Adds a user's socket ID to online users map `online:{userId}` in Redis
   */
  async addOnlineUser(userId, socketId) {
    if (!isRedisReady()) return false;
    try {
      const key = redisKeys.onlineKey(userId);
      await redisClient.sAdd(key, socketId);
      return true;
    } catch (error) {
      logger.error(`PubSubService addOnlineUser Error [userId: ${userId}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Removes a user's socket ID on disconnect
   */
  async removeOnlineUser(userId, socketId) {
    if (!isRedisReady()) return false;
    try {
      const key = redisKeys.onlineKey(userId);
      await redisClient.sRem(key, socketId);
      const remaining = await redisClient.sCard(key);
      if (remaining === 0) {
        await redisClient.del(key);
      }
      return true;
    } catch (error) {
      logger.error(`PubSubService removeOnlineUser Error [userId: ${userId}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Checks if user is online
   */
  async isUserOnline(userId) {
    if (!isRedisReady()) return false;
    try {
      const key = redisKeys.onlineKey(userId);
      const count = await redisClient.sCard(key);
      return count > 0;
    } catch (error) {
      logger.error(`PubSubService isUserOnline Error [userId: ${userId}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Returns list of socket IDs for an online user
   */
  async getOnlineUserSockets(userId) {
    if (!isRedisReady()) return [];
    try {
      const key = redisKeys.onlineKey(userId);
      return await redisClient.sMembers(key);
    } catch (error) {
      logger.error(`PubSubService getOnlineUserSockets Error [userId: ${userId}]: ${error.message}`);
      return [];
    }
  }

  /**
   * Publishes real-time event message over Redis Pub/Sub channel
   */
  async publishEvent(channel, messageData) {
    if (!isRedisReady()) return false;
    try {
      const channelName = channel || redisKeys.pubsubChannel();
      const payload = typeof messageData === "string" ? messageData : JSON.stringify(messageData);
      await pubClient.publish(channelName, payload);
      return true;
    } catch (error) {
      logger.error(`PubSubService publishEvent Error [channel: ${channel}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Subscribes to Redis Pub/Sub channel for multi-server Socket.IO messaging
   */
  async subscribeChannel(channel, callback) {
    if (!isRedisReady()) return false;
    try {
      const channelName = channel || redisKeys.pubsubChannel();
      await subClient.subscribe(channelName, (message) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (e) {
          callback(message);
        }
      });
      logger.info(`Subscribed to Redis channel: ${channelName}`);
      return true;
    } catch (error) {
      logger.error(`PubSubService subscribeChannel Error [channel: ${channel}]: ${error.message}`);
      return false;
    }
  }
}

module.exports = new PubSubService();
