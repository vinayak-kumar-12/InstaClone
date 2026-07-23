const { redisClient, isRedisReady } = require("../config/redis");
const redisKeys = require("../utils/redisKeys");
const logger = require("../utils/logger");

class NotificationQueueService {
  /**
   * Pushes notification job payload into Redis List queue `queue:notifications`
   */
  async enqueueNotification(notificationData) {
    if (!isRedisReady()) {
      // Fallback: process inline if Redis is down
      const { createAndEmitNotification } = require("./notification.service");
      return await createAndEmitNotification(notificationData);
    }

    try {
      const queueKey = redisKeys.notificationQueueKey();
      const payload = JSON.stringify(notificationData);
      await redisClient.rPush(queueKey, payload);
      logger.info(`Notification queued [type: ${notificationData.type}, recipientId: ${notificationData.recipientId}]`);
      return true;
    } catch (error) {
      logger.error(`NotificationQueueService enqueueNotification Error: ${error.message}`);
      // Fallback: process inline
      const { createAndEmitNotification } = require("./notification.service");
      return await createAndEmitNotification(notificationData);
    }
  }
}

module.exports = new NotificationQueueService();
