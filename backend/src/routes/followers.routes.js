const express = require("express");

const {
  followUserController,
  unfollowUserController,
  getFollowersController,
  getFollowingController,
  getFollowCountsController,
} = require("../controller/followers.controller");

const protect = require("../middleware/auth.middleware");
const redisRateLimit = require("../middleware/redisRateLimit.middleware");

const router = express.Router();

router.post("/:userId", protect, redisRateLimit("follow", 20, 60), followUserController);

router.delete("/:userId", protect, unfollowUserController);

router.get("/followers/:userId", protect, getFollowersController);

router.get("/following/:userId", protect, getFollowingController);

router.get("/count/:userId", protect, getFollowCountsController);

module.exports = router;