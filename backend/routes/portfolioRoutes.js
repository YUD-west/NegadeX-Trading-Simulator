const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctl = require('../controllers/portfolioController');

router.get('/me',           protect, ctl.mySnapshot);
router.get('/transactions', protect, ctl.myTransactions);
router.get('/export',       protect, ctl.exportTransactions);

module.exports = router;
