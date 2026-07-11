const express = require("express");
const {
  getOrCreateChat,
  fetchUserChats,
  fetchChatDetails,
} = require("../controller/chat.controller");
const protect = require("../middleware/auth.middleware");

const router = express.Router();

// Routes for chat management
router.post("/", protect, getOrCreateChat);
router.get("/", protect, fetchUserChats);
router.get("/:id", protect, fetchChatDetails);

module.exports = router;
