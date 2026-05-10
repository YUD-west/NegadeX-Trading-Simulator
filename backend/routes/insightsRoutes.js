const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctl = require('../controllers/insightsController');

router.get('/recommendations', ctl.recos);
router.get('/heatmap',         ctl.heatmap);
router.get('/equity',          protect, ctl.equityCurve);
router.get('/risk',            protect, ctl.portfolioRisk);
router.get('/achievements',    protect, ctl.achievements);

module.exports = router;
