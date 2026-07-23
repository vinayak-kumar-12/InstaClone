const express = require("express");

const { getFeed } = require("../controller/feed.controller");

const protect = require("../middleware/auth.middleware");
const { cacheMiddleware } = require("../middleware/cache.middleware");
const redisKeys = require("../utils/redisKeys");

const router = express.Router();

router.get("/", protect, cacheMiddleware((req) => redisKeys.feedKey(`${req.user.id}:page:${req.query.page || 1}`), 60), getFeed);

module.exports = router;