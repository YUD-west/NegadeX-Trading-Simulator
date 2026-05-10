const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  engineId: { type: String, index: true },
  symbol:   { type: String, required: true, uppercase: true, index: true },
  side:     { type: String, enum: ['BUY', 'SELL'], required: true },
  type:     { type: String, enum: ['LIMIT', 'MARKET'], default: 'LIMIT' },
  quantity: { type: Number, required: true, min: 1 },
  filled:   { type: Number, default: 0 },
  price:    { type: Number, required: true },
  status:   { type: String, enum: ['OPEN', 'PARTIAL', 'FILLED', 'CANCELLED'], default: 'OPEN' },
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
