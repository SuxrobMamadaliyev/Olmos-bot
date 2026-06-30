const User = require('./User');

const BOT_USERNAME = process.env.BOT_USERNAME;
const REFERRAL_REWARD = Number(process.env.REFERRAL_REWARD || 250);
const PAYMENTS_CHANNEL = process.env.PAYMENTS_CHANNEL || REQUIRED_CHANNEL_FALLBACK();
const SUPPORT_USERNAME = process.env.SUPPORT_USERNAME || 'admin';

function REQUIRED_CHANNEL_FALLBACK() {
  return process.env.REQUIRED_CHANNEL || 'your_channel';
}

async function earnHandler(ctx) {
  const referralLink = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
  return ctx.reply(
    `💎 Almaz ishlash\n\n🔗 Sizning referal havolangiz:👇\n\n${referralLink}\n\n` +
      `⚡️Yuqoridagi referal havolangizni do'stlaringizga tarqating va har bir to'liq ro'yxatdan o'tgan referalingiz uchun ${REFERRAL_REWARD} 💎 hisobingizga qo'shiladi.✅`
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
  return ctx.reply(
    `📚 Qo'llanma\n\n` +
      `1️⃣ "💎 Ishlash" tugmasi orqali referal havolangizni oling.\n` +
      `2️⃣ Havolani do'stlaringizga yuboring.\n` +
      `3️⃣ Ular bot orqali kanalga obuna bo'lib /start bosishi bilan sizga ${REFERRAL_REWARD} 💎 qo'shiladi.\n` +
      `4️⃣ "💰 Hisobim" bo'limidan balansingizni kuzating.\n` +
      `5️⃣ Yetarli olmos to'plangach, "🏦 Almazni yechish" orqali so'rov yuboring.`
  );
}

async function paymentsChannelHandler(ctx) {
  return ctx.reply(`📣 To'lovlar kanali\n\nBarcha tasdiqlangan to'lovlar shu yerda e'lon qilinadi:\nhttps://t.me/${PAYMENTS_CHANNEL}`);
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
