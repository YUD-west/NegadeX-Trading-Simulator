const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  symbol:        { type: String, required: true, unique: true, uppercase: true, index: true },
  name:          { type: String, required: true },
  sector:        { type: String, default: 'Other' },
  price:         { type: Number, required: true },
  open:          { type: Number, required: true },
  high:          { type: Number, required: true },
  low:           { type: Number, required: true },
  previousClose: { type: Number, required: true },
  change:        { type: Number, default: 0 },
  changePercent: { type: Number, default: 0 },
  volume24h:     { type: Number, default: 0 },
  marketCap:     { type: Number, default: 0 },
  volatility:    { type: Number, default: 0.012 },
  drift:         { type: Number, default: 0.0002 },
  isSuspended:   { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.Stock || mongoose.model('Stock', StockSchema);
