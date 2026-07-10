const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, default: null },
    firstName: { type: String, default: null },

    phone: { type: String, default: null },           // telefon raqami (+998...)
    phoneVerified: { type: Boolean, default: false }, // telefon tasdiqlangan?

    balance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    referralsCount: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },

    referredBy: { type: Number, default: null },
    isSubscribed: { type: Boolean, default: false },
    rewardGranted: { type: Boolean, default: false },

    isBlocked: { type: Boolean, default: false }, // admin tomonidan ban qilingan

    botBlocked: { type: Boolean, default: false },     // botni bloklagan/o'chirib tashlagan
    leftPenaltyApplied: { type: Boolean, default: false }, // jarima allaqachon qo'llanildimi

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
