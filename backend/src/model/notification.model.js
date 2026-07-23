const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: Number,
      required: true,
      index: true,
    },
    senderId: {
      type: Number,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        // Social
        "like",
        "comment",
        "reply",
        "follow",
        "follow_accept",
        "mention",
        "tag",
        // Stories
        "story_like",
        "story_reply",
        "story_mention",
        // Messages
        "message",
        "message_reaction",
        "group_message",
        "message_request",
        // Posts
        "share_post",
        "save_post",
        "trending_post",
        // Account
        "login_alert",
        "password_changed",
        "email_updated",
        "security_alert",
        // System
        "welcome",
        "feature_update",
        "maintenance",
        "announcement",
      ],
      index: true,
    },
    entityType: {
      type: String,
      enum: ["post", "comment", "user", "story", "chat", "system"],
      default: "system",
    },
    entityId: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast query performance & sorting
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, type: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
