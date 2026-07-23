const {
  createUser,
  findUserByEmail,
  findUserByUsername,
  incrementFailedAttempts,
  lockAccount,
  resetFailedAttempts,
  searchUsersModel,
  updateUserProfilePic,
  updateProfileDetails,
  findUserById,
} = require("../model/user.model");
const {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require("../model/token.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { AuthenticationError, ConflictError, AppError } = require("../utils/errors");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");
const sessionService = require("../services/session.service");
const otpService = require("../services/otp.service");
const { invalidateUserCache, invalidateSearchCache } = require("../middleware/cache.middleware");

// Token generation helper
const generateTokens = (userId) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  const accessToken = jwt.sign({ id: userId }, accessSecret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
  });

  const refreshToken = jwt.sign({ id: userId }, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });

  return { accessToken, refreshToken };
};

// Cookie configuration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

// ======================= SIGNUP =======================
const signUp = asyncHandler(async (req, res) => {
  const { username, email, password, bio, name } = req.body;

  // Double check duplicates (redundancy for database-level constraint checks)
  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    throw new ConflictError("Email address is already in use.");
  }

  const existingUsername = await findUserByUsername(username);
  if (existingUsername) {
    throw new ConflictError("Username is already taken.");
  }

  // Hash Password with secure cost factor (12 rounds)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create User
  const user = await createUser({
    username,
    email,
    password: hashedPassword,
    bio: bio || "",
    profilePic: "", // Default empty profile picture
  });

  // Generate session tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in PostgreSQL
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await createRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt,
    ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: req.headers["user-agent"] || "",
  });

  // Log signup security event
  logger.info(`New user registered successfully`, { userId: user.id, email: user.email });

  // Send Refresh Token in HTTP-only Cookie and access token in JSON response
  res.cookie("refreshToken", refreshToken, getCookieOptions());

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profile_pic,
        profile_pic: user.profile_pic,
      },
    },
  });
});

// ======================= LOGIN =======================
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find User
  const user = await findUserByEmail(email);
  if (!user) {
    logger.security(`Failed login attempt: non-existent email`, { email });
    throw new AuthenticationError("Invalid email or password");
  }

  // Check lockout status
  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    const lockTimeRemaining = Math.ceil((new Date(user.lock_until) - new Date()) / (60 * 1000));
    logger.security(`Blocked login attempt on locked account`, { userId: user.id, email: user.email });
    throw new AuthenticationError(
      `This account is temporarily locked due to too many failed attempts. Try again in ${lockTimeRemaining} minute(s).`
    );
  }

  // Compare Password
  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    // Increment failed login count
    const failedAttempts = await incrementFailedAttempts(user.id);
    logger.security(`Failed login attempt: incorrect password`, { userId: user.id, email: user.email, attempts: failedAttempts });

    // Lock account if failed attempts exceed limit (5 attempts)
    if (failedAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      await lockAccount(user.id, lockUntil);
      logger.security(`Account locked due to consecutive failures`, { userId: user.id, email: user.email });
      throw new AuthenticationError("Too many failed attempts. Your account is temporarily locked for 15 minutes.");
    }

    throw new AuthenticationError("Invalid email or password");
  }

  // Login successful - Reset failed login attempts
  await resetFailedAttempts(user.id);

  // Generate access & refresh tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in database & Redis
  const deviceId = req.headers["x-device-id"] || req.headers["user-agent"] || "default_device";
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await createRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt,
    ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: req.headers["user-agent"] || "",
  });

  await sessionService.saveRefreshToken(user.id, deviceId, refreshToken);

  logger.info(`User logged in successfully`, { userId: user.id });

  // Set HTTP-only Cookie
  res.cookie("refreshToken", refreshToken, getCookieOptions());

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profile_pic,
        profile_pic: user.profile_pic,
      },
    },
  });
});

// ======================= REFRESH TOKEN =======================
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    throw new AuthenticationError("Refresh token is missing. Please log in again.");
  }

  // Verify the refresh token cryptographically
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  let decoded;
  try {
    decoded = jwt.verify(token, refreshSecret);
  } catch (err) {
    logger.security("Cryptographically invalid refresh token presented", { token });
    throw new AuthenticationError("Session expired. Please log in again.");
  }

  // Retrieve refresh token from DB
  const storedToken = await findRefreshToken(token);

  // If token doesn't exist, or is already marked revoked, it's a potential reuse attack!
  if (!storedToken || storedToken.revoked) {
    if (storedToken) {
      // Reuse attack detected: revoke all active refresh tokens for the user
      await revokeAllUserTokens(storedToken.user_id);
      logger.security(
        `Refresh token reuse detected! Revoking all sessions for user.`,
        { userId: storedToken.user_id }
      );
    }
    // Clear cookies as precaution
    res.clearCookie("refreshToken", getCookieOptions());
    throw new AuthenticationError("Session expired. Please log in again.");
  }

  // Check if token is expired in database
  if (new Date(storedToken.expires_at) < new Date()) {
    res.clearCookie("refreshToken", getCookieOptions());
    throw new AuthenticationError("Session expired. Please log in again.");
  }

  // Token is valid: Rotate it!
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(storedToken.user_id);

  // Mark the old token revoked and record replacement
  await revokeRefreshToken(token, newRefreshToken);

  // Save new refresh token in DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await createRefreshToken({
    userId: storedToken.user_id,
    token: newRefreshToken,
    expiresAt,
    ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: req.headers["user-agent"] || "",
  });

  logger.info(`Refresh token rotated successfully`, { userId: storedToken.user_id });

  // Update HTTP-only Cookie
  res.cookie("refreshToken", newRefreshToken, getCookieOptions());

  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: {
      accessToken,
    },
  });
});

// ======================= LOGOUT =======================
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  const deviceId = req.headers["x-device-id"] || req.headers["user-agent"] || "default_device";

  if (token) {
    // Revoke token in database & Redis
    await revokeRefreshToken(token);
    if (req.user && req.user.id) {
      await sessionService.revokeDeviceSession(req.user.id, deviceId);
    }
    logger.info("User logged out and refresh token revoked");
  }

  // Clear cookie
  res.clearCookie("refreshToken", getCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

// ======================= LOGOUT ALL DEVICES =======================
const logoutAllDevices = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await sessionService.revokeAllUserSessions(userId);
  await revokeAllUserTokens(userId);
  res.clearCookie("refreshToken", getCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged out from all devices successfully.",
  });
});

// ======================= GET CURRENT USER =======================
const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user is populated by protect middleware
  res.status(200).json({
    success: true,
    message: "Current user retrieved successfully",
    data: {
      user: req.user,
    },
  });
});

// ======================= SEARCH USERS =======================
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user.id;

  if (!q || !q.trim()) {
    return res.status(200).json({
      success: true,
      users: [],
    });
  }

  const users = await searchUsersModel(q.trim(), currentUserId);

  res.status(200).json({
    success: true,
    users,
  });
});

const { uploadStream } = require("../utils/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");

const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split("/upload/");
  if (parts.length < 2) return null;
  const afterUpload = parts[1];
  const pathParts = afterUpload.split("/");
  if (pathParts[0].startsWith("v") && !isNaN(pathParts[0].substring(1))) {
    pathParts.shift();
  }
  const publicIdWithExtension = pathParts.join("/");
  const lastDotIndex = publicIdWithExtension.lastIndexOf(".");
  if (lastDotIndex !== -1) {
    return publicIdWithExtension.substring(0, lastDotIndex);
  }
  return publicIdWithExtension;
};

// ======================= UPDATE PROFILE =======================
const updateProfile = asyncHandler(async (req, res) => {
  const { bio, website, location } = req.body;
  const userId = req.user.id;

  // character limits: bio 150, website 100, location 50
  if (bio !== undefined && bio.length > 150) {
    throw new AppError("Bio cannot exceed 150 characters", 400);
  }
  if (website !== undefined && website.length > 100) {
    throw new AppError("Website cannot exceed 100 characters", 400);
  }
  if (location !== undefined && location.length > 50) {
    throw new AppError("Location cannot exceed 50 characters", 400);
  }

  // Validate website if it is provided and not empty
  if (website && website.trim() !== "") {
    try {
      const urlToTest = website.startsWith("http://") || website.startsWith("https://") ? website : "https://" + website;
      new URL(urlToTest);
    } catch (e) {
      throw new AppError("Invalid website URL format", 400);
    }
  }

  const updatedUser = await updateProfileDetails(userId, {
    bio: bio !== undefined ? bio : "",
    website: website !== undefined ? website : "",
    location: location !== undefined ? location : "",
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        profilePic: updatedUser.profile_pic,
        profile_pic: updatedUser.profile_pic,
        website: updatedUser.website,
        location: updatedUser.location,
      },
    },
  });
});

// ======================= UPDATE PROFILE PIC =======================
const updateProfilePic = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    throw new AppError("No image file provided", 400);
  }

  // Validate mimetype: JPG, JPEG, PNG, WEBP
  const allowedMimetypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedMimetypes.includes(req.file.mimetype)) {
    throw new AppError("Invalid image type. Supported formats: JPG, JPEG, PNG, WEBP", 400);
  }

  // Max size 5 MB
  if (req.file.size > 5 * 1024 * 1024) {
    throw new AppError("Image size cannot exceed 5 MB", 400);
  }

  const user = await findUserById(userId);
  const oldPicUrl = user ? user.profile_pic : null;

  // Upload new image to Cloudinary (use folder "instaclone/profiles")
  const uploadResult = await uploadStream(req.file.buffer, "instaclone/profiles");
  const newPicUrl = uploadResult.secure_url;

  // Save new image URL in DB
  const updatedUser = await updateUserProfilePic(userId, newPicUrl);

  const io = req.app.get("io");
  if (io) {
    io.emit("profileUpdated", {
      userId: userId,
      profilePic: newPicUrl,
    });
  }

  // Delete previous Cloudinary image if it exists and was a Cloudinary URL
  if (oldPicUrl && oldPicUrl.includes("res.cloudinary.com")) {
    const oldPublicId = getPublicIdFromUrl(oldPicUrl);
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (err) {
        logger.error(`Failed to delete old profile pic from Cloudinary: ${err.message}`);
      }
    }
  }

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully",
    data: {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        profilePic: updatedUser.profile_pic,
        profile_pic: updatedUser.profile_pic,
        website: updatedUser.website,
        location: updatedUser.location,
      },
    },
  });
});

// ======================= DELETE PROFILE PIC =======================
const deleteProfilePic = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await findUserById(userId);
  const oldPicUrl = user ? user.profile_pic : null;

  // Clear in DB
  const updatedUser = await updateUserProfilePic(userId, "");

  const io = req.app.get("io");
  if (io) {
    io.emit("profileUpdated", {
      userId: userId,
      profilePic: "",
    });
  }

  // Delete old from Cloudinary
  if (oldPicUrl && oldPicUrl.includes("res.cloudinary.com")) {
    const oldPublicId = getPublicIdFromUrl(oldPicUrl);
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (err) {
        logger.error(`Failed to delete profile pic from Cloudinary: ${err.message}`);
      }
    }
  }

  res.status(200).json({
    success: true,
    message: "Profile picture removed successfully",
    data: {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        profilePic: updatedUser.profile_pic,
        profile_pic: updatedUser.profile_pic,
        website: updatedUser.website,
        location: updatedUser.location,
      },
    },
  });
});

// ======================= GET USER PROFILE BY ID =======================
const getUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profile_pic,
        profile_pic: user.profile_pic,
        website: user.website,
        location: user.location,
      },
    },
  });
});

// ======================= OTP & PASSWORD RESET =======================
const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError("Email is required.", 400);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError("No account found with this email.", 404);
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  await otpService.storeOTP(email, otp, 300); // 5 minutes TTL

  logger.info(`OTP generated for ${email}: ${otp}`);

  res.status(200).json({
    success: true,
    message: "OTP sent successfully. It will expire in 5 minutes.",
    otp: process.env.NODE_ENV === "development" ? otp : undefined,
  });
});

const verifyOTPAndResetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    throw new AppError("Email, OTP, and new password are required.", 400);
  }

  const isValid = await otpService.verifyOTP(email, otp);
  if (!isValid) {
    throw new AppError("Invalid or expired OTP.", 400);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const { postDB } = require("../config/postgres");
  const pool = postDB();
  await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, user.id]);

  // Revoke all sessions on password reset
  await sessionService.revokeAllUserSessions(user.id);
  await revokeAllUserTokens(user.id);

  res.status(200).json({
    success: true,
    message: "Password reset successfully. Please log in with your new password.",
  });
});

module.exports = {
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
};
