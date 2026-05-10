const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, adminOnly } = require('../middleware/auth');
const ctl = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get ('/stats',                     ctl.stats);
router.get ('/users',                     ctl.allUsers);
router.put ('/users/:id/suspend',         body('suspended').isBoolean(), validate, ctl.suspendUser);
router.put ('/stocks/:symbol',            ctl.updateStock);

router.post(
  '/shock',
  body('symbol').isString().notEmpty(),
  body('strength').isFloat({ min: -0.5, max: 0.5 }),
  validate,
  ctl.triggerShock,
);

router.post(
  '/regime',
  body('regime').isIn(['BULL', 'BEAR', 'NEUTRAL', 'VOLATILE']),
  validate,
  ctl.setRegime,
);

router.post(
  '/replay',
  body('sequence').optional().isIn(['FLASH_CRASH', 'BULL_RUN']),
  validate,
  ctl.replay,
);

module.exports = router;
