const {
  createUser,
  findUserByEmail,
  findUserByUsername,
  incrementFailedAttempts,
  lockAccount,
  resetFailedAttempts,
  searchUsersModel,
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

  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await createRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt,
    ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: req.headers["user-agent"] || "",
  });

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

  if (token) {
    // Revoke token in the database
    await revokeRefreshToken(token);
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

module.exports = {
  signUp,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  searchUsers,
};
