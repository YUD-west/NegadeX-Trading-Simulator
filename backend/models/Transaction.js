const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  symbol:   { type: String, required: true, uppercase: true, index: true },
  side:     { type: String, enum: ['BUY', 'SELL'], required: true },
  type:     { type: String, enum: ['LIMIT', 'MARKET'], default: 'MARKET' },
  quantity: { type: Number, required: true, min: 1 },
  price:    { type: Number, required: true, min: 0 },
  total:    { type: Number, required: true },
  realisedPnL: { type: Number, default: 0 },
  status:   { type: String, enum: ['EXECUTED', 'CANCELLED', 'PARTIAL'], default: 'EXECUTED' },
}, { timestamps: true });

TransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
