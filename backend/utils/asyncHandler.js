/**
 * Wraps an async controller and forwards rejections to Express's
 * error pipeline, removing the need for try/catch in every handler.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
