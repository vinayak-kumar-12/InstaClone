const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controller/notification.controller");

// Protect all notification routes
router.use(authMiddleware);

// Notification endpoints
router.get("/", getNotifications);
router.get("/unread", getUnreadNotifications);
router.get("/count", getUnreadCount);

router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

router.delete("/clear-all", clearAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;
