const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctl = require('../controllers/authController');

router.post(
  '/register',
  body('name').isString().isLength({ min: 2, max: 60 }),
  body('email').isEmail(),
  body('password').isString().isLength({ min: 6 }),
  validate,
  ctl.register,
);

router.post(
  '/login',
  body('email').isEmail(),
  body('password').isString().notEmpty(),
  validate,
  ctl.login,
);

router.get('/me', protect, ctl.me);
router.put('/me', protect, ctl.updateProfile);

module.exports = router;
