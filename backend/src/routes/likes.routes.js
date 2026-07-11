const express = require("express");

const {
  toggleLike,
  getLikesCount,
  getLikesUsers,
} = require("../controller/likes.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/:postId", protect, toggleLike);

router.get("/:postId", protect, getLikesCount);

router.get("/:postId/users", protect, getLikesUsers);

module.exports = router;