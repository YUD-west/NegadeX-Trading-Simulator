const router = require('express').Router();
const ctl = require('../controllers/leaderboardController');
router.get('/', ctl.leaderboard);
module.exports = router;
