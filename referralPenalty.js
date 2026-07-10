const User = require('./User');
const { getSettings } = require('./settingsUtils');

/**
 * Taklif qilingan foydalanuvchi botni bloklab/o'chirib tashlaganda chaqiriladi.
 * Agar unga referal mukofoti berilgan bo'lsa, taklif qilgan odamdan
 * mukofotning 50%ini (jarima sifatida) ayiradi. Faqat bir marta ishlaydi.
 */
async function applyLeavePenalty(telegramId, telegram) {
  const user = await User.findOne({ telegramId });
  if (!user) return;

  // Bot allaqachon bloklangani qayd etilgan bo'lsa, qayta ishlamaymiz
  if (user.botBlocked && user.leftPenaltyApplied) return;

  user.botBlocked = true;

  // Jarima faqat: referal orqali kelgan, mukofot berilgan va hali jarima qo'llanilmagan bo'lsa
  if (!user.referredBy || !user.rewardGranted || user.leftPenaltyApplied) {
    await user.save();
    return;
  }

  const referrer = await User.findOne({ telegramId: user.referredBy });
  const settings = await getSettings();
  const penalty = Math.floor(settings.referralReward / 2);

  if (referrer && penalty > 0) {
    referrer.balance = Math.max(0, referrer.balance - penalty);
    await referrer.save();

    if (telegram) {
      const name = user.firstName || user.username || 'Foydalanuvchi';
      await telegram
        .sendMessage(
          referrer.telegramId,
          `⚠️ <b>Diqqat!</b>\n\n` +
          `👤 <b>${name}</b> ismli taklif qilgan foydalanuvchingiz botni bloklab qo'ydi yoki botdan chiqib ketdi.\n\n` +
          `💎 Jarima sifatida balansingizdan <b>${penalty} almaz</b> ayirildi (referal mukofotining 50%i).\n` +
          `📊 Joriy balansingiz: <b>${referrer.balance} 💎</b>`,
          { parse_mode: 'HTML' }
        )
        .catch(() => {});
    }
  }

  user.leftPenaltyApplied = true;
  await user.save();
}

/**
 * Foydalanuvchi botni qayta ishga tushirganda (blokdan chiqarganda) chaqiriladi.
 * Faqat botBlocked belgisini tozalaydi; jarima qaytarilmaydi.
 */
async function clearBotBlockedFlag(telegramId) {
  await User.updateOne({ telegramId }, { $set: { botBlocked: false } });
}

module.exports = { applyLeavePenalty, clearBotBlockedFlag };
