const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([
  ['💎 Ishlash', '💰 Hisobim'],
  ['🏦 Almazni yechish', '📚 Qo\'llanma'],
  ['📣 To\'lovlar kanali', '📧 Murojaat'],
]).resize();

const backMenu = Markup.keyboard([['◀️ Orqaga']]).resize();

function subscribeKeyboard(channelUsername) {
  return Markup.inlineKeyboard([
    [Markup.button.url('📢 Kanalga o\'tish', `https://t.me/${channelUsername}`)],
    [Markup.button.callback('✅ Obuna bo\'ldim', 'check_subscription')],
  ]);
}

module.exports = { mainMenu, backMenu, subscribeKeyboard };
