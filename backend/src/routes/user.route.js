const express = require("express");
const {
  signUp,
  login,
  refreshToken,
  logout,
  logoutAllDevices,
  getCurrentUser,
  searchUsers,
  updateProfile,
  updateProfilePic,
  deleteProfilePic,
  getUserProfile,
  sendOTP,
  verifyOTPAndResetPassword,
} = require("../controller/user.controller");
const { protect } = require("../middleware/auth.middleware");
const { validateSignup, validateLogin } = require("../middleware/validation.middleware");
const upload = require("../middleware/multer");
const redisRateLimit = require("../middleware/redisRateLimit.middleware");
const { cacheMiddleware } = require("../middleware/cache.middleware");
const redisKeys = require("../utils/redisKeys");

const router = express.Router();

// Auth & Session Endpoints with Redis Rate Limiting
router.post("/signup", redisRateLimit("signup", 5, 60), validateSignup, signUp);
router.post("/login", redisRateLimit("login", 5, 60), validateLogin, login);
router.post("/refresh", refreshToken);
router.post("/logout", protect, logout);
router.post("/logout-all", protect, logoutAllDevices);

// OTP & Password Reset Endpoints
router.post("/forgot-password/otp", redisRateLimit("otp", 3, 300), sendOTP);
router.post("/reset-password/otp", redisRateLimit("reset-password", 5, 300), verifyOTPAndResetPassword);

// Cached GET Endpoints
router.get("/me", protect, getCurrentUser);
router.get("/search", protect, cacheMiddleware((req) => redisKeys.searchKey(req.query.q || ""), 120), searchUsers);
router.get("/profile/:userId", protect, cacheMiddleware((req) => redisKeys.userKey(req.params.userId), 300), getUserProfile);

// Profile and profile picture routes
router.put("/profile", protect, updateProfile);
router.put("/profile-pic", protect, upload.single("profilePic"), updateProfilePic);
router.delete("/profile-pic", protect, deleteProfilePic);

router.get("/protected", protect, (req, res) => {
  res.status(200).json({
    success: true,
  });
});

module.exports = router;
