const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctl = require('../controllers/tradeController');

router.post(
  '/order',
  protect,
  body('symbol').isString().notEmpty(),
  body('side').isIn(['BUY', 'SELL']),
  body('quantity').isInt({ min: 1 }),
  body('type').optional().isIn(['MARKET', 'LIMIT']),
  body('price').optional().isFloat({ min: 0.01 }),
  validate,
  ctl.placeOrder,
);

router.delete('/order/:engineId',  protect, ctl.cancelOrder);
router.post  ('/undo',             protect, ctl.undoLast);
router.get   ('/orderbook/:symbol', ctl.orderBook);
router.get   ('/recent',           ctl.recentTrades);

module.exports = router;
