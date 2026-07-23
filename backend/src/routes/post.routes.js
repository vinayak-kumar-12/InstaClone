const express = require("express");

const {
  createNewPost,
  getPosts,
  getReels,
  getSinglePost,
  getUserPosts,
  getUserReels,
  editPost,
  removePost,
  uploadMedia,
} = require("../controller/post.controller");

const protect = require("../middleware/auth.middleware");
const upload = require("../middleware/multer");

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadMedia);
router.post("/", protect, upload.single("image"), createNewPost);

router.get("/", protect, getPosts);

router.get("/reels", protect, getReels);

router.get("/user/:userId", protect, getUserPosts);

router.get("/user/:userId/reels", protect, getUserReels);

router.get("/:id", protect, getSinglePost);

router.put("/:id", protect, editPost);

router.delete("/:id", protect, removePost);

module.exports = router;
