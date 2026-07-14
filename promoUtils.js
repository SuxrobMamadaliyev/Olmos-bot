const { Markup } = require('telegraf');

// Promokod postining matnini yasaydi (kanal uchun)
function buildPromoText(promo) {
  const statusLine = promo.isActive
    ? `✅ Olish uchun pastdagi tugmani bosing!`
    : `⛔️ Bu promokod tugadi!`;

  return (
    `🎁 <b>PROMOKOD</b>\n\n` +
    `🏷 Promokod: <code>${promo.code}</code>\n` +
    `💎 Bonus: ${promo.amount} 💎\n` +
    `👥 Limit: ${promo.usedCount}/${promo.limit}\n\n` +
    `${statusLine}`
  );
}

// Promokod postining klaviaturasini yasaydi (faol bo'lsa tugma bilan, bo'lmasa tugmasiz)
function buildPromoKeyboard(promo) {
  if (!promo.isActive) return { reply_markup: { inline_keyboard: [] } };
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎁 Promokodni olish', `promo_claim_${promo.code}`)],
  ]);
}

// Tasodifiy promokod matni yaratadi (masalan: 6 ta belgidan iborat)
function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // chalkash bo'lishi mumkin bo'lgan 0/O, 1/I olib tashlandi
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = { buildPromoText, buildPromoKeyboard, generateRandomCode };
