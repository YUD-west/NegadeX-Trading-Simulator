/* eslint-disable no-unused-vars */
function notFound(req, _res, next) {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal server error',
  };
  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production' && status === 500) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
