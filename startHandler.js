const { Markup } = require('telegraf');
const User = require('./User');
const { mainMenu, subscribeKeyboard } = require('./keyboards');
const { checkAllSubscriptions } = require('./subscription');
const { getSettings } = require('./settingsUtils');
const { isAdmin } = require('./adminUtils');

const phoneKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📱 Telefon raqamimni yuborish')],
]).resize().oneTime();

async function startHandler(ctx) {
  const telegramId = ctx.from.id;
  const username = ctx.from.username || null;
  const firstName = ctx.from.first_name || null;

  const payload = ctx.message.text.split(' ')[1];
  const referrerId = payload ? Number(payload) : null;

  let user = await User.findOne({ telegramId });
  if (!user) {
    user = await User.create({
      telegramId, username, firstName,
      referredBy: referrerId && referrerId !== telegramId ? referrerId : null,
    });
  } else {
    user.username = username;
    user.firstName = firstName;
    await user.save();
  }

  // 1-qadam: Kanal obunasini tekshirish
  const { subscribed, missing } = await checkAllSubscriptions(ctx);
  if (!subscribed) {
    return ctx.reply(
      `📢 Botdan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling:\n\nObuna bo'lgach, "✅ Obuna bo'ldim" tugmasini bosing.`,
      subscribeKeyboard(missing)
    );
  }

  // 2-qadam: Telefon raqamini tasdiqlash
  if (!user.phoneVerified) {
    return ctx.reply(
      `📱 Telefon raqamingizni tasdiqlang\n\n` +
      `Pastdagi tugmani bosib telefon raqamingizni yuboring.\n` +
      `⚠️ Faqat +998 (O'zbekiston) raqamlari qabul qilinadi.`,
      phoneKeyboard
    );
  }

  await grantReferralRewardIfNeeded(user, ctx.telegram);
  return ctx.reply(
    `👋 Assalomu alaykum, ${firstName || 'foydalanuvchi'}!\n\nQuyidagi menyudan birini tanlang 👇`,
    mainMenu(isAdmin(telegramId))
  );
}

async function checkSubscriptionHandler(ctx) {
  const { subscribed, missing } = await checkAllSubscriptions(ctx);
  if (!subscribed) {
    return ctx.answerCbQuery('❌ Siz hali barcha kanallarga obuna bo\'lmagansiz!', { show_alert: true });
  }

  await ctx.answerCbQuery('✅ Obuna tasdiqlandi!');
  await ctx.deleteMessage().catch(() => {});

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user && !user.phoneVerified) {
    return ctx.reply(
      `📱 Telefon raqamingizni tasdiqlang\n\n` +
      `Pastdagi tugmani bosib telefon raqamingizni yuboring.\n` +
      `⚠️ Faqat +998 (O'zbekiston) raqamlari qabul qilinadi.`,
      phoneKeyboard
    );
  }

  if (user) await grantReferralRewardIfNeeded(user, ctx.telegram);
  return ctx.reply('✅ Tasdiqlandi! Quyidagi menyudan foydalaning 👇', mainMenu(isAdmin(ctx.from.id)));
}

async function phoneContactHandler(ctx) {
  const contact = ctx.message.contact;
  if (!contact) return;

  if (contact.user_id !== ctx.from.id) {
    return ctx.reply('❌ Iltimos, faqat o\'zingizning telefon raqamingizni yuboring.', phoneKeyboard);
  }

  const phone = '+' + contact.phone_number.replace(/\D/g, '');
  if (!phone.startsWith('+998')) {
    return ctx.reply(
      `❌ Kechirasiz, faqat O'zbekiston (+998) raqamlari qabul qilinadi.\n\nSizning raqamingiz: ${phone}`,
      phoneKeyboard
    );
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply('Iltimos, /start bosing.');

  user.phone = phone;
  user.phoneVerified = true;
  await user.save();

  await grantReferralRewardIfNeeded(user, ctx.telegram);

  return ctx.reply(
    `✅ Telefon raqamingiz tasdiqlandi: ${phone}\n\nEndi botdan to'liq foydalanishingiz mumkin 👇`,
    mainMenu(isAdmin(ctx.from.id))
  );
}

async function grantReferralRewardIfNeeded(user, telegram) {
  if (!user.referredBy || user.rewardGranted) return;
  if (!user.phoneVerified || !user.phone || !user.phone.startsWith('+998')) return;

  const referrer = await User.findOne({ telegramId: user.referredBy });
  if (!referrer) return;

  const settings = await getSettings();
  referrer.balance += settings.referralReward;
  referrer.totalEarned += settings.referralReward;
  referrer.referralsCount += 1;
  await referrer.save();

  user.rewardGranted = true;
  await user.save();

  if (telegram) {
    const name = user.firstName || user.username || 'Yangi foydalanuvchi';
    await telegram
      .sendMessage(
        referrer.telegramId,
        `🎉 Tabriklaymiz!\n\n` +
        `👤 <b>${name}</b> sizning referal havolangiz orqali ro'yxatdan o'tdi va telefon raqamini tasdiqladi.\n\n` +
        `💎 Sizga <b>${settings.referralReward} almaz</b> berildi!\n` +
        `📊 Joriy balansingiz: <b>${referrer.balance} 💎</b>`,
        { parse_mode: 'HTML' }
      )
      .catch(() => {});
  }
}

module.exports = { startHandler, checkSubscriptionHandler, phoneContactHandler };
