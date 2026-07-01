const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    paymentsChannel: { type: String, default: null },
    referralReward: { type: Number, default: 250 },
    minWithdraw: { type: Number, default: 1000 },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Settings', settingsSchema);
