const express = require("express");

const { getFeed } = require("../controller/feed.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getFeed);

module.exports = router;