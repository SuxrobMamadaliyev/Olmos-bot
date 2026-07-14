const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    amount: { type: Number, required: true },   // har bir foydalanuvchiga beriladigan olmos miqdori
    limit: { type: Number, required: true },    // promokodni jami nechta kishi ishlata olishi
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: Number }],                 // promokodni olgan foydalanuvchilar telegramId lari
    isActive: { type: Boolean, default: true },

    channelChatId: { type: Number, default: null },   // xabar joylangan kanal chat id
    channelMessageId: { type: Number, default: null }, // yangilash uchun xabar id

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('PromoCode', promoCodeSchema);
