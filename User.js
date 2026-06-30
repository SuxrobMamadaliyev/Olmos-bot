const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, default: null },
    firstName: { type: String, default: null },

    balance: { type: Number, default: 0 }, // joriy olmos balansi
    totalEarned: { type: Number, default: 0 }, // umumiy yig'ilgan olmos (statistika uchun)
    referralsCount: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },

    referredBy: { type: Number, default: null }, // kim taklif qilgan (telegramId)
    isSubscribed: { type: Boolean, default: false }, // majburiy kanalga obuna holati
    rewardGranted: { type: Boolean, default: false }, // referal mukofoti berilganmi

    isBlocked: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
