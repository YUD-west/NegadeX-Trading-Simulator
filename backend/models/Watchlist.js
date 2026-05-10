const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  symbols: [{ type: String, uppercase: true }],
  alerts: [{
    symbol:   { type: String, uppercase: true, required: true },
    price:    { type: Number, required: true },
    direction:{ type: String, enum: ['ABOVE', 'BELOW'], required: true },
    triggered:{ type: Boolean, default: false },
    createdAt:{ type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.models.Watchlist || mongoose.model('Watchlist', WatchlistSchema);
