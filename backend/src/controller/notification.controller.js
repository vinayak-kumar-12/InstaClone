const Notification = require("../model/notification.model");
const { findUserById } = require("../model/user.model");
const asyncHandler = require("../utils/asyncHandler");

// Map category tabs to notification types
const CATEGORY_TYPE_MAP = {
  likes: ["like", "story_like"],
  comments: ["comment", "reply", "story_reply"],
  followers: ["follow", "follow_accept"],
  mentions: ["mention", "tag", "story_mention"],
  messages: ["message", "message_reaction", "group_message", "message_request"],
  stories: ["story_like", "story_reply", "story_mention"],
  system: ["welcome", "feature_update", "maintenance", "announcement", "login_alert", "security_alert"],
};

/**
 * GET /api/notifications
 * Fetch notifications with pagination, category filtering, and search
 */
const getNotifications = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;
  const category = (req.query.category || "all").toLowerCase();
  const searchQuery = (req.query.search || "").trim().toLowerCase();

  // Base Mongo Query
  const query = { recipientId: currentUserId };

  // Apply Category Filter
  if (category !== "all" && CATEGORY_TYPE_MAP[category]) {
    query.type = { $in: CATEGORY_TYPE_MAP[category] };
  }

  // Fetch from Mongo
  let rawNotifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    recipientId: currentUserId,
    isRead: false,
  });

  // Unique Senders List for PostgreSQL User Lookup Batching
  const senderIds = [...new Set(rawNotifications.map((n) => n.senderId).filter(Boolean))];
  const sendersMap = {};

  for (const sId of senderIds) {
    if (sId > 0) {
      const u = await findUserById(sId);
      if (u) {
        sendersMap[sId] = {
          id: u.id,
          username: u.username,
          profile_pic: u.profile_pic || "",
        };
      }
    }
  }

  // Format and Enrich Notifications
  let formattedNotifications = rawNotifications.map((notif) => {
    const sender = sendersMap[notif.senderId] || {
      id: notif.senderId,
      username: "System",
      profile_pic: "",
    };

    return {
      ...notif,
      id: notif._id.toString(),
      sender,
    };
  });

  // Apply Search Filter by Username or Type if provided
  if (searchQuery) {
    formattedNotifications = formattedNotifications.filter(
      (n) =>
        n.sender.username.toLowerCase().includes(searchQuery) ||
        n.type.toLowerCase().includes(searchQuery) ||
        n.message.toLowerCase().includes(searchQuery)
    );
  }

  return res.status(200).json({
    success: true,
    notifications: formattedNotifications,
    pagination: {
      page,
      limit,
      total,
      hasMore: skip + formattedNotifications.length < total,
    },
    unreadCount,
  });
});

/**
 * GET /api/notifications/unread
 * Fetch only unread notifications
 */
const getUnreadNotifications = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const notifications = await Notification.find({
    recipientId: currentUserId,
    isRead: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    unreadCount: notifications.length,
    notifications,
  });
});

/**
 * GET /api/notifications/count
 * Fetch unread count badge number
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const unreadCount = await Notification.countDocuments({
    recipientId: currentUserId,
    isRead: false,
  });

  return res.status(200).json({
    success: true,
    unreadCount,
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipientId: currentUserId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  const unreadCount = await Notification.countDocuments({
    recipientId: currentUserId,
    isRead: false,
  });

  // Real-time socket notification update
  const io = req.app.get("io");
  if (io) {
    io.to(`user_${currentUserId}`).emit("notification:read", { id });
    io.to(`user_${currentUserId}`).emit("notification:count", { unreadCount });
  }

  return res.status(200).json({
    success: true,
    message: "Marked as read",
    notification,
    unreadCount,
  });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);

  await Notification.updateMany(
    { recipientId: currentUserId, isRead: false },
    { isRead: true }
  );

  const io = req.app.get("io");
  if (io) {
    io.to(`user_${currentUserId}`).emit("notification:read-all");
    io.to(`user_${currentUserId}`).emit("notification:count", { unreadCount: 0 });
  }

  return res.status(200).json({
    success: true,
    message: "All notifications marked as read",
    unreadCount: 0,
  });
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { id } = req.params;

  const deleted = await Notification.findOneAndDelete({
    _id: id,
    recipientId: currentUserId,
  });

  if (!deleted) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  const unreadCount = await Notification.countDocuments({
    recipientId: currentUserId,
    isRead: false,
  });

  const io = req.app.get("io");
  if (io) {
    io.to(`user_${currentUserId}`).emit("notification:delete", { id });
    io.to(`user_${currentUserId}`).emit("notification:count", { unreadCount });
  }

  return res.status(200).json({
    success: true,
    message: "Notification deleted",
    unreadCount,
  });
});

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for current user
 */
const clearAllNotifications = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);

  await Notification.deleteMany({ recipientId: currentUserId });

  const io = req.app.get("io");
  if (io) {
    io.to(`user_${currentUserId}`).emit("notification:clear-all");
    io.to(`user_${currentUserId}`).emit("notification:count", { unreadCount: 0 });
  }

  return res.status(200).json({
    success: true,
    message: "All notifications cleared",
    unreadCount: 0,
  });
});

module.exports = {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
