const express = require("express");
const {
  sendMessage,
  fetchChatMessages,
  deleteMessage,
  seenMessages,
} = require("../controller/message.controller");
const protect = require("../middleware/auth.middleware");

const router = express.Router();

// Routes for message management
router.post("/", protect, sendMessage);
router.get("/:chatId", protect, fetchChatMessages);
router.delete("/:id", protect, deleteMessage);
router.put("/seen/:chatId", protect, seenMessages);

module.exports = router;
