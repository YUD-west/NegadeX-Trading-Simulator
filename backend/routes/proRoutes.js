const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctl = require('../controllers/proController');

router.get('/options/quote', ctl.optionQuote);
router.get('/sentiment', ctl.sentiment);

router.use(protect);

router.get('/challenges', ctl.challenges);
router.get('/advanced-orders', ctl.advancedOrders);
router.post(
  '/advanced-orders',
  body('symbol').isString().notEmpty(),
  body('side').isIn(['BUY', 'SELL']),
  body('kind').isIn(['STOP_LOSS', 'TAKE_PROFIT']),
  body('triggerPrice').isFloat({ min: 0.01 }),
  body('quantity').isInt({ min: 1 }),
  validate,
  ctl.createAdvancedOrder,
);

router.get('/social', ctl.socialList);
router.post('/social', body('text').isString().isLength({ min: 1, max: 280 }), validate, ctl.socialCreate);
router.post('/social/:id/like', ctl.socialLike);

router.get('/backtest', ctl.backtest);
router.get('/analytics', ctl.analytics);

module.exports = router;
