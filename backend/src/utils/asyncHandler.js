/**
 * Wraps an async Express middleware/route handler to catch any errors and forward them to the next error middleware.
 * @param {Function} fn - Async express route handler function
 * @returns {Function} - Wrapped express route handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
