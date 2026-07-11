const express = require("express");

const {
  addComment,
  getComments,
  editComment,
  removeComment,
} = require("../controller/comments.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/:postId", protect, addComment);

router.get("/:postId", protect, getComments);

router.put("/:commentId", protect, editComment);

router.delete("/:commentId", protect, removeComment);

module.exports = router;