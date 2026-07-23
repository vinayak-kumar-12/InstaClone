const express = require("express");

const {
  addComment,
  getComments,
  editComment,
  removeComment,
} = require("../controller/comments.controller");

const protect = require("../middleware/auth.middleware");
const redisRateLimit = require("../middleware/redisRateLimit.middleware");

const router = express.Router();

router.post("/:postId", protect, redisRateLimit("comment", 15, 60), addComment);

router.get("/:postId", protect, getComments);

router.put("/:commentId", protect, editComment);

router.delete("/:commentId", protect, removeComment);

module.exports = router;