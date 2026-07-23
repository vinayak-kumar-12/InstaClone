const { redisClient, isRedisReady } = require("../config/redis");
const redisKeys = require("../utils/redisKeys");
const logger = require("../utils/logger");

class OTPService {
  /**
   * Stores OTP in Redis with 5-minute (300 seconds) auto-expiry
   */
  async storeOTP(email, otp, ttlSeconds = 300) {
    if (!isRedisReady()) return false;
    try {
      const key = redisKeys.otpKey(email);
      await redisClient.set(key, String(otp), { EX: ttlSeconds });
      return true;
    } catch (error) {
      logger.error(`OTPService storeOTP Error [email: ${email}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifies OTP and atomically deletes key on success to prevent re-use
   */
  async verifyOTP(email, otp) {
    if (!isRedisReady()) return false;
    try {
      const key = redisKeys.otpKey(email);
      const storedOTP = await redisClient.get(key);

      if (storedOTP && storedOTP === String(otp)) {
        await redisClient.del(key); // One-time use deletion
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`OTPService verifyOTP Error [email: ${email}]: ${error.message}`);
      return false;
    }
  }
}

module.exports = new OTPService();
