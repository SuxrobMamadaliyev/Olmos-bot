const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([
  ['💎 Ishlash', '💰 Hisobim'],
  ['🏦 Almazni yechish', '📚 Qo\'llanma'],
  ['📣 To\'lovlar kanali', '📧 Murojaat'],
]).resize();

const backMenu = Markup.keyboard([['◀️ Orqaga']]).resize();

const cancelMenu = Markup.keyboard([['❌ Bekor qilish']]).resize();

// Bir nechta majburiy kanal uchun obuna klaviaturasi
function subscribeKeyboard(channels) {
  const buttons = channels.map((ch) => {
    const username = ch.username.replace('@', '');
    const label = ch.title ? `📢 ${ch.title}` : `📢 ${username}`;
    return [Markup.button.url(label, `https://t.me/${username}`)];
  });
  buttons.push([Markup.button.callback('✅ Obuna bo\'ldim', 'check_subscription')]);
  return Markup.inlineKeyboard(buttons);
}

// Admin panel - bosh menyu
const adminMainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📊 Statistika', 'admin_stats')],
  [Markup.button.callback('📡 Majburiy kanallar', 'admin_channels')],
  [Markup.button.callback('⏳ Kutilayotgan so\'rovlar', 'admin_pending')],
  [
    Markup.button.callback('🚫 Ban berish', 'admin_ban'),
    Markup.button.callback('✅ Banni olish', 'admin_unban'),
  ],
  [Markup.button.callback('📣 To\'lovlar kanalini o\'zgartirish', 'admin_payments_channel')],
  [Markup.button.callback('💎 Referal narxini o\'zgartirish', 'admin_referral_reward')],
  [Markup.button.callback('📤 Xabar yuborish (broadcast)', 'admin_broadcast')],
  [Markup.button.callback('👥 Foydalanuvchilar', 'admin_users')],
]);

// Kanallar boshqaruvi menyusi
function adminChannelsKeyboard(channels) {
  const buttons = channels.map((ch) => [
    Markup.button.callback(`🗑 ${ch.title || ch.username}`, `admin_channel_del_${ch._id}`),
  ]);
  buttons.push([Markup.button.callback('➕ Kanal qo\'shish', 'admin_channel_add')]);
  buttons.push([Markup.button.callback('◀️ Orqaga', 'admin_back')]);
  return Markup.inlineKeyboard(buttons);
}

const adminBackKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('◀️ Orqaga', 'admin_back')],
]);

module.exports = {
  mainMenu,
  backMenu,
  cancelMenu,
  subscribeKeyboard,
  adminMainKeyboard,
  adminChannelsKeyboard,
  adminBackKeyboard,
};
