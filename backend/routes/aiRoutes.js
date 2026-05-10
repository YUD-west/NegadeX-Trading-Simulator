const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctl = require('../controllers/aiController');

// Tighter limiter for the AI surface — every reply touches the live store.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);
router.use(aiLimiter);

router.get('/suggestions', ctl.suggestions);

router.post(
  '/chat',
  body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('message required'),
  body('history').optional().isArray({ max: 30 }),
  validate,
  ctl.chat,
);

module.exports = router;
