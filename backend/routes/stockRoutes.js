const router = require('express').Router();
const ctl = require('../controllers/stockController');

router.get('/',                    ctl.list);
router.get('/trending',            ctl.trending);
router.get('/news',                ctl.news);
router.get('/sectors',             ctl.sectors);
router.get('/summary',             ctl.marketSummary);
router.get('/:symbol',             ctl.detail);
router.get('/:symbol/history',     ctl.history);
router.get('/:symbol/lookup',      ctl.lookupAt);

module.exports = router;
