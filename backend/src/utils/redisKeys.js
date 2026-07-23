/**
 * Centralized Redis Key Formatter Utilities
 * Ensures consistent namespace formatting across all features.
 */
module.exports = {
  userKey: (id) => `user:${id}`,
  postKey: (id) => `post:${id}`,
  feedKey: (userId) => `feed:${userId}`,
  searchKey: (query) => `search:${query.toLowerCase().trim()}`,
  otpKey: (email) => `otp:${email.toLowerCase().trim()}`,
  sessionKey: (userId) => `session:${userId}`,
  onlineKey: (userId) => `online:${userId}`,
  refreshKey: (userId, deviceId) => `refresh:${userId}:${deviceId}`,
  lockKey: (resource, action) => `lock:${resource}:${action}`,
  rateLimitKey: (identifier, route) => `ratelimit:${route}:${identifier}`,
  notificationQueueKey: () => `queue:notifications`,
  pubsubChannel: () => `channel:socketio`,
};
