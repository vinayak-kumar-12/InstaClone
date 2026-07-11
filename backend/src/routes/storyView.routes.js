const express = require("express");

const {
  viewStoryController,
  getStoryViewersController,
  getStoryViewsCountController,
} = require("../controller/storyView.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

// View Story
router.post("/:storyId/view", protect, viewStoryController);

// Get Story Viewers
router.get("/:storyId/viewers", protect, getStoryViewersController);

// Get Story Views Count
router.get("/:storyId/views/count", protect, getStoryViewsCountController);

module.exports = router;