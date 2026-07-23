const express = require("express");
const dotenv = require("dotenv");

// Load environment variables immediately
dotenv.config();

// Validate critical environment variables
const validateEnv = require("./src/config/env");
validateEnv();

const connectDB = require("./src/config/mongo");
const authRoutes = require("./src/routes/user.route");
const { postDB } = require("./src/config/postgres");
const postRoutes = require("./src/routes/post.routes");
const likeRoutes = require("./src/routes/likes.routes");
const commentRoutes = require("./src/routes/comments.routes");
const followerRoutes = require("./src/routes/followers.routes");
const feedRoutes = require("./src/routes/feed.routes");
const savedPostRoutes = require("./src/routes/savedPost.routes");
const storyRoutes = require("./src/routes/story.v2.routes");
const storyViewRoutes = require("./src/routes/storyView.routes");
const chatRoutes = require("./src/routes/chat.routes");
const messageRoutes = require("./src/routes/message.routes");
const notificationRoutes = require("./src/routes/notification.routes");

const http = require("http");
const { Server } = require("socket.io");
const { initSocket } = require("./src/socket");

const {
  helmetMiddleware,
  corsMiddleware,
  requestIdMiddleware,
  responseTimeLoggerMiddleware,
  jsonLimitMiddleware,
  urlencodedLimitMiddleware,
  compressionMiddleware,
  cookieParserMiddleware,
} = require("./src/middleware/security.middleware");
const { globalLimiter } = require("./src/middleware/rateLimit.middleware");
const globalErrorHandler = require("./src/middleware/error.middleware");
const morgan = require("morgan");

const { initRedis } = require("./src/config/redis");
const { startNotificationWorker } = require("./src/workers/notification.worker");

connectDB();
postDB();
initRedis();

const app = express();

// Trust proxy for secure cookies / rate limiting behind load balancers
app.enable("trust proxy");

const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);
initSocket(io);

// Request identification and timing logging
app.use(requestIdMiddleware);

// Apply request logging based on environment
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(responseTimeLoggerMiddleware);
}

// Global security headers, CORS, compression and cookie parsing
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compressionMiddleware);
app.use(cookieParserMiddleware);

// Request body size limiting
app.use(jsonLimitMiddleware);
app.use(urlencodedLimitMiddleware);

// Multi-Tier Health Check Endpoints
app.get(["/health", "/live"], (req, res) => {
  const { isRedisReady } = require("./src/config/redis");
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: isRedisReady(),
  });
});

app.get("/ready", async (req, res) => {
  const { isRedisReady } = require("./src/config/redis");
  const { pool } = require("./src/config/postgres");
  const mongoose = require("mongoose");

  let postgresStatus = false;
  try {
    const client = await pool.connect();
    postgresStatus = true;
    client.release();
  } catch (e) {
    postgresStatus = false;
  }

  const mongoStatus = mongoose.connection.readyState === 1;
  const redisStatus = isRedisReady();
  const isReady = postgresStatus && mongoStatus;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "not_ready",
    postgres: postgresStatus,
    mongodb: mongoStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/follow", followerRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/saved", savedPostRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/story-views", storyViewRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

// Global Error Handler
app.use(globalErrorHandler);

const runningServer = server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  startNotificationWorker();
});

// Graceful Shutdown & Process Safety Handlers
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Initiating graceful shutdown...`);
  runningServer.close(async () => {
    console.log("HTTP server closed.");
    try {
      const { pool } = require("./src/config/postgres");
      await pool.end();
      console.log("PostgreSQL pool closed.");
    } catch (e) {}
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forceful shutdown after 10s timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown:", error);
});
