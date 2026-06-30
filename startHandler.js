const User = require('./User');
const { mainMenu, subscribeKeyboard } = require('./keyboards');
const { checkAllSubscriptions } = require('./subscription');

const REFERRAL_REWARD = Number(process.env.REFERRAL_REWARD || 250);

async function startHandler(ctx) {
  const telegramId = ctx.from.id;
  const username = ctx.from.username || null;
  const firstName = ctx.from.first_name || null;

  // referal kodini /start dan ajratib olish (masalan /start 8919935566)
  const payload = ctx.message.text.split(' ')[1];
  const referrerId = payload ? Number(payload) : null;

  let user = await User.findOne({ telegramId });

  if (!user) {
    user = await User.create({
      telegramId,
      username,
      firstName,
      referredBy: referrerId && referrerId !== telegramId ? referrerId : null,
    });
  } else {
    // ma'lumotlarni yangilab turamiz
    user.username = username;
    user.firstName = firstName;
    await user.save();
  }

  // Majburiy obunani tekshirish (bir nechta kanal bo'lishi mumkin)
  const { subscribed, missing } = await checkAllSubscriptions(ctx);

  if (!subscribed) {
    return ctx.reply(
      `📢 Botdan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling:\n\nObuna bo'lgach, "✅ Obuna bo'ldim" tugmasini bosing.`,
      subscribeKeyboard(missing)
    );
  }

  await grantReferralRewardIfNeeded(user);

  return ctx.reply(
    `👋 Assalomu alaykum, ${firstName || 'foydalanuvchi'}!\n\nQuyidagi menyudan birini tanlang 👇`,
    mainMenu
  );
}

// "✅ Obuna bo'ldim" tugmasi bosilganda
async function checkSubscriptionHandler(ctx) {
  const telegramId = ctx.from.id;
  const { subscribed, missing } = await checkAllSubscriptions(ctx);

  if (!subscribed) {
    return ctx.answerCbQuery('❌ Siz hali barcha kanallarga obuna bo\'lmagansiz!', { show_alert: true });
  }

  const user = await User.findOne({ telegramId });
  if (user) {
    await grantReferralRewardIfNeeded(user);
  }

  await ctx.answerCbQuery('✅ Obuna tasdiqlandi!');
  await ctx.deleteMessage().catch(() => {});
  return ctx.reply('✅ Obuna tasdiqlandi! Quyidagi menyudan foydalaning 👇', mainMenu);
}

// Referal mukofotini faqat bir marta, obuna tasdiqlangandan keyin beramiz
async function grantReferralRewardIfNeeded(user) {
  if (!user.referredBy || user.rewardGranted) return;

  const referrer = await User.findOne({ telegramId: user.referredBy });
  if (!referrer) return;

  referrer.balance += REFERRAL_REWARD;
  referrer.totalEarned += REFERRAL_REWARD;
  referrer.referralsCount += 1;
  await referrer.save();

  user.rewardGranted = true;
  await user.save();
}

module.exports = { startHandler, checkSubscriptionHandler };
