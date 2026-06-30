const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, index: true },
    username: { type: String, default: null },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Withdraw', withdrawSchema);
