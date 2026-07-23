const Notification = require("../model/notification.model");
const { findUserById } = require("../model/user.model");

/**
 * Creates a notification in MongoDB, enriches it with sender info from PostgreSQL,
 * and emits real-time Socket.IO events to the recipient.
 */
const createAndEmitNotification = async ({
  recipientId,
  senderId,
  type,
  entityType = "system",
  entityId = null,
  title = "",
  message = "",
  image = "",
  metadata = {},
  appInstance = null, // express app instance to retrieve 'io'
  io = null,
}) => {
  try {
    const numericRecipient = Number(recipientId);
    const numericSender = Number(senderId);

    // Do not notify self actions (e.g. liking your own post) except for system/account alerts
    if (numericRecipient === numericSender && !["login_alert", "password_changed", "email_updated", "security_alert", "welcome", "feature_update", "maintenance", "announcement"].includes(type)) {
      return null;
    }

    // Deduplication check for social actions (prevent duplicate like/follow notifications within 1 minute)
    if (["like", "follow", "story_like", "save_post"].includes(type)) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const existing = await Notification.findOne({
        recipientId: numericRecipient,
        senderId: numericSender,
        type,
        entityId: String(entityId),
        createdAt: { $gte: oneMinuteAgo },
      });

      if (existing) {
        return existing;
      }
    }

    // Create Notification Record
    const notification = await Notification.create({
      recipientId: numericRecipient,
      senderId: numericSender,
      type,
      entityType,
      entityId: entityId ? String(entityId) : null,
      title,
      message,
      image,
      metadata,
      isRead: false,
    });

    // Fetch Sender Info from PostgreSQL to populate real-time payload
    let senderObj = { id: numericSender, username: "System", profile_pic: "" };
    if (numericSender > 0) {
      const senderUser = await findUserById(numericSender);
      if (senderUser) {
        senderObj = {
          id: senderUser.id,
          username: senderUser.username,
          profile_pic: senderUser.profile_pic || "",
        };
      }
    }

    // Format final notification payload
    const formattedNotification = {
      ...notification.toObject(),
      id: notification._id.toString(),
      sender: senderObj,
    };

    // Calculate updated unread count
    const unreadCount = await Notification.countDocuments({
      recipientId: numericRecipient,
      isRead: false,
    });

    // Emit Real-Time Socket Event to recipient's personal room
    const socketIo = io || (appInstance && appInstance.get("io"));
    if (socketIo) {
      socketIo.to(`user_${numericRecipient}`).emit("notification:new", formattedNotification);
      socketIo.to(`user_${numericRecipient}`).emit("notification:count", { unreadCount });
    }

    return formattedNotification;
  } catch (error) {
    console.error("Error creating/emitting notification:", error);
    return null;
  }
};

/**
 * Retrieves unread notification count for a recipient
 */
const getUnreadNotificationCount = async (recipientId) => {
  return await Notification.countDocuments({
    recipientId: Number(recipientId),
    isRead: false,
  });
};

module.exports = {
  createAndEmitNotification,
  getUnreadNotificationCount,
};
