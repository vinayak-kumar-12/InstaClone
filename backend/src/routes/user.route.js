const express = require("express");
const { signUp, login, refreshToken, logout, getCurrentUser, searchUsers, updateProfile, updateProfilePic, deleteProfilePic, getUserProfile } = require("../controller/user.controller");
const { protect } = require("../middleware/auth.middleware");
const { validateSignup, validateLogin } = require("../middleware/validation.middleware");
const { loginLimiter, signupLimiter, loginSlowDown } = require("../middleware/rateLimit.middleware");
const upload = require("../middleware/multer");

const router = express.Router();

router.post("/signup", signupLimiter, validateSignup, signUp);
router.post("/login", loginLimiter, loginSlowDown, validateLogin, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);
router.get("/search", protect, searchUsers);
router.get("/profile/:userId", protect, getUserProfile);

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
