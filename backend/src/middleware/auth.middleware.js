const jwt = require("jsonwebtoken");
const { findUserById } = require("../model/user.model");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Middleware to protect routes. Verifies the Access JWT in the Authorization header
 * and attaches the current authenticated user to the request.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AuthenticationError("You are not logged in. Please log in to get access.");
  }

  // Verify access token
  const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const decoded = jwt.verify(token, accessSecret);

  // Check if user still exists
  const currentUser = await findUserById(decoded.id);
  if (!currentUser) {
    throw new AuthenticationError("The user belonging to this token no longer exists.");
  }

  // Check if user account is temporarily locked
  if (currentUser.lock_until && new Date(currentUser.lock_until) > new Date()) {
    throw new AuthenticationError("This account is temporarily locked. Please try again later.");
  }

  // Grant access (exclude sensitive fields)
  req.user = {
    id: currentUser.id,
    username: currentUser.username,
    email: currentUser.email,
    bio: currentUser.bio,
    profilePic: currentUser.profile_pic,
    website: currentUser.website || "",
    location: currentUser.location || "",
  };

  next();
});

/**
 * Generic authorization middleware factory to check resource ownership.
 * Checks if req.user.id matches the owner field of the resource.
 * @param {Function} getResourceByIdFn - Function to fetch resource by ID from DB (returns resource object)
 * @param {string} paramName - Name of the route parameter containing resource ID (e.g. 'id')
 * @param {string} ownerField - Database column representing resource owner (defaults to 'user_id')
 */
const checkOwnership = (getResourceByIdFn, paramName = "id", ownerField = "user_id") => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[paramName];
    if (!resourceId) {
      throw new AuthorizationError("Resource ID parameter is missing.");
    }

    const resource = await getResourceByIdFn(resourceId);
    if (!resource) {
      throw new AuthorizationError("Resource not found or has been deleted.");
    }

    // Verify ownership
    const ownerId = resource[ownerField];
    if (!ownerId || Number(ownerId) !== Number(req.user.id)) {
      throw new AuthorizationError("You do not have permission to modify this resource.");
    }

    // Attach resource to req for controller use if needed
    req.resource = resource;
    next();
  });
};

// Attach helpers to protect function for backward compatibility
protect.protect = protect;
protect.checkOwnership = checkOwnership;

module.exports = protect;
