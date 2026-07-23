const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  createStory,
  getStoriesFeed,
  getUserStories,
  recordStoryView,
  getStoryViewers,
  reactToStory,
  replyToStory,
  deleteStory,
  getArchiveStories,
  manageHighlights,
  manageCloseFriends,
} = require("../controller/story.v2.controller");

router.use(authMiddleware);

// Stories Endpoints
router.post("/", createStory);
router.get("/feed", getStoriesFeed);
router.get("/user/:userId", getUserStories);

router.post("/view/:storyId", recordStoryView);
router.get("/viewers/:storyId", getStoryViewers);

router.post("/reaction", reactToStory);
router.post("/reply", replyToStory);

router.delete("/:storyId", deleteStory);

router.get("/archive", getArchiveStories);

router.get("/highlights", manageHighlights);
router.post("/highlight", manageHighlights);

router.get("/close-friends", manageCloseFriends);
router.post("/close-friends", manageCloseFriends);

module.exports = router;
