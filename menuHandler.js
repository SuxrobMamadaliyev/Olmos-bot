const User = require('./User');
const { Markup } = require('telegraf');
const { getSettings } = require('./settingsUtils');

const BOT_USERNAME = process.env.BOT_USERNAME;
const SUPPORT_USERNAME = process.env.SUPPORT_USERNAME || 'admin';

async function earnHandler(ctx) {
  const settings = await getSettings();
  const referralLink = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
  const shareText = `💎 Bizning bot orqali olmos ishlab oling! Mana mening referal havolam:`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;

  return ctx.reply(
    `💎 Almaz ishlash\n\n🔗 Sizning referal havolangiz:👇\n\n${referralLink}\n\n` +
      `⚡️Yuqoridagi referal havolangizni do'stlaringizga tarqating va har bir to'liq ro'yxatdan o'tgan referalingiz uchun ${settings.referralReward} 💎 hisobingizga qo'shiladi.✅`,
    Markup.inlineKeyboard([[Markup.button.url('📤 Do\'stlarga ulashish', shareUrl)]])
  );
}

async function balanceHandler(ctx) {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply('Iltimos, avval /start buyrug\'ini bosing.');

  const now = new Date();
  const formattedDate = now.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  return ctx.reply(
    `💰 Hisobim\n\n` +
      `🆔 Sizning ID raqamingiz: ${user.telegramId}\n` +
      `🔗 Useringiz: @${user.username || 'nomaʼlum'}\n` +
      `🤑 Jami hisobingiz: ${user.balance} 💎\n` +
      `👥 Takliflaringiz soni: ${user.referralsCount} ta\n` +
      `📤 Yechib olgan Almazlaringiz: ${user.totalWithdrawn} 💎\n` +
      `⏰ Hozirgi vaqt: ${formattedDate} | ${formattedTime}\n\n` +
      `🤖 Bizning bot: @${BOT_USERNAME}`
  );
}

async function guideHandler(ctx) {
  const settings = await getSettings();
  return ctx.reply(
    `📚 Qo'llanma\n\n` +
      `1️⃣ "💎 Almaz ishlash" tugmasi orqali referal havolangizni oling.\n` +
      `2️⃣ Havolani do'stlaringizga yuboring.\n` +
      `3️⃣ Ular bot orqali kanalga obuna bo'lib /start bosishi bilan sizga ${settings.referralReward} 💎 qo'shiladi.\n` +
      `4️⃣ "💰 Hisobim" bo'limidan balansingizni kuzating.\n` +
      `5️⃣ Yetarli olmos to'plangach, "🏦 Almazni yechish" orqali so'rov yuboring.`
  );
}

async function paymentsChannelHandler(ctx) {
  const settings = await getSettings();
  return ctx.reply(`📣 To'lovlar kanali\n\nBarcha tasdiqlangan to'lovlar shu yerda e'lon qilinadi:\nhttps://t.me/${settings.paymentsChannel}`);
}

async function supportHandler(ctx) {
  return ctx.reply(`📧 Murojaat\n\nSavol va takliflar uchun: @${SUPPORT_USERNAME}`);
}

module.exports = {
  earnHandler,
  balanceHandler,
  guideHandler,
  paymentsChannelHandler,
  supportHandler,
};
