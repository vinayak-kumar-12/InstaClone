const { createClient } = require("redis");
const { createAndEmitNotification } = require("../services/notification.service");
const redisKeys = require("../utils/redisKeys");
const logger = require("../utils/logger");

let isWorkerRunning = false;
let workerClient = null;

/**
 * Starts background Notification Worker popping jobs from Redis queue via BLPOP
 */
const startNotificationWorker = async () => {
  if (isWorkerRunning) return;

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

  workerClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 500, 5000),
    },
  });

  workerClient.on("error", (err) => {
    logger.error(`Notification Worker Redis Error: ${err.message}`);
  });

  try {
    await workerClient.connect();
    isWorkerRunning = true;
    logger.info("Notification Queue Worker started successfully.");

    // Worker Loop
    while (isWorkerRunning) {
      try {
        const queueKey = redisKeys.notificationQueueKey();
        // Blocking Pop from list with 5 second timeout
        const item = await workerClient.blPop(queueKey, 5);

        if (item && item.element) {
          const notificationData = JSON.parse(item.element);
          await createAndEmitNotification(notificationData);
          logger.info(`Notification worker processed job [type: ${notificationData.type}]`);
        }
      } catch (err) {
        logger.error(`Notification worker loop error: ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    logger.error(`Failed to start Notification Worker: ${error.message}`);
    isWorkerRunning = false;
  }
};

const stopNotificationWorker = () => {
  isWorkerRunning = false;
  if (workerClient && workerClient.isOpen) {
    workerClient.quit();
  }
};

module.exports = {
  startNotificationWorker,
  stopNotificationWorker,
};
