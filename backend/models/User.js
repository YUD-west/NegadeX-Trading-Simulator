const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 60 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  isSuspended: { type: Boolean, default: false },
  startingBalance: { type: Number, default: 100000 },
  cash:     { type: Number, default: 100000 },
  realizedPnL: { type: Number, default: 0 },
  avatar:   { type: String, default: '' },
  bio:      { type: String, default: '' },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (raw) {
  return bcrypt.compare(raw, this.password);
};

UserSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
