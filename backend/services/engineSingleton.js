const { MatchingEngine } = require('../algorithms/matchingEngine');
/**
 * One MatchingEngine instance shared across the entire process.
 * Other modules subscribe to its 'trade' / 'orderRested' / 'orderCancelled' events.
 */
const engine = new MatchingEngine();
module.exports = engine;
