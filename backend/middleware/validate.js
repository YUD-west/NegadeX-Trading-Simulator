const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map(e => ({ field: e.path, msg: e.msg }));
  return next(new ApiError(400, 'Validation failed', details));
}

module.exports = validate;
