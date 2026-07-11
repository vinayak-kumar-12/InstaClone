const express = require("express");

const {
  savePostController,
  unsavePostController,
  getSavedPostsController,
  getSavedPostsCountController,
} = require("../controller/savedPost.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/:postId", protect, savePostController);

router.delete("/:postId", protect, unsavePostController);

router.get("/", protect, getSavedPostsController);

router.get("/count", protect, getSavedPostsCountController);

module.exports = router;