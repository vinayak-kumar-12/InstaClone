const jwt = require("jsonwebtoken");
const registerEvents = require("./events");
const pubsubService = require("../services/pubsub.service");

// In-memory map to store online users: userId -> Set(socket.id)
const onlineUsers = new Map();

const initSocket = (io) => {
  // Subscribe to Redis Pub/Sub for multi-server Socket.IO scaling
  pubsubService.subscribeChannel("channel:socketio", (data) => {
    if (data && data.room && data.event) {
      io.to(data.room).emit(data.event, data.payload);
    }
  });

  // Middleware to authenticate Socket.IO connections using the existing JWT secret
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1] ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication error: JWT token is required."));
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Store user details (like user id) inside the socket instance
      next();
    } catch (error) {
      console.error("Socket authentication failed:", error.message);
      return next(new Error("Authentication error: Invalid or expired token."));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${userId} (${socket.user.username}), socket: ${socket.id}`);

    // Register user to the online list (in-memory + Redis)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    await pubsubService.addOnlineUser(userId, socket.id);

    // Join personal room automatically (to reach all connected devices for this user)
    socket.join(`user_${userId}`);

    // Broadcast the updated online users list to all clients
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    // Register other chat and messaging socket events
    registerEvents(io, socket, onlineUsers);

    // Automatic cleanup on disconnect
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          console.log(`User offline: ${userId}`);
        }
      }
      await pubsubService.removeOnlineUser(userId, socket.id);

      // Broadcast the updated online list
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

module.exports = {
  initSocket,
  onlineUsers,
};
