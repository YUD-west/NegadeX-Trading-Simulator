const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  symbol:    { type: String, required: true, uppercase: true },
  quantity:  { type: Number, required: true, min: 0 },
  avgPrice:  { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
}, { _id: false });

const PortfolioSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  holdings: [HoldingSchema],
  cash:     { type: Number, default: 100000 },
}, { timestamps: true });

module.exports = mongoose.models.Portfolio || mongoose.model('Portfolio', PortfolioSchema);
