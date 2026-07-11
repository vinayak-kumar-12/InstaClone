const express = require("express");

const {
  createStory,
  getStories,
  getStoriesByUser,
  removeStory,
} = require("../controller/story.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, createStory);

router.get("/", protect, getStories);

router.get("/user/:userId", protect, getStoriesByUser);

router.delete("/:id", protect, removeStory);

module.exports = router;
