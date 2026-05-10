const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctl = require('../controllers/watchlistController');

router.use(protect);

router.get('/', ctl.list);

// IMPORTANT: declare /alerts routes BEFORE /:symbol so they don't get
// shadowed by the dynamic-segment matcher (which would treat "alerts"
// as a stock symbol and 404 with "Unknown stock").
router.post(
  '/alerts',
  body('symbol').isString().notEmpty(),
  body('price').isFloat({ min: 0.01 }),
  body('direction').isIn(['ABOVE', 'BELOW']),
  validate,
  ctl.addAlert,
);
router.delete('/alerts/:idx', ctl.removeAlert);

router.post  ('/:symbol', ctl.add);
router.delete('/:symbol', ctl.remove);

module.exports = router;
