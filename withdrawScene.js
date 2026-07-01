const { Scenes, Markup } = require('telegraf');
const User = require('./User');
const Withdraw = require('./Withdraw');
const { mainMenu } = require('./keyboards');
const { getSettings } = require('./settingsUtils');
const { isAdmin } = require('./adminUtils');

const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter(Boolean);

const withdrawScene = new Scenes.BaseScene('withdrawScene');

withdrawScene.enter(async (ctx) => {
  const settings = await getSettings();
  const minWithdraw = settings.minWithdraw;
  const user = await User.findOne({ telegramId: ctx.from.id });

  if (!user || user.balance < minWithdraw) {
    await ctx.reply(
      `🏦 Almazni yechish\n\n❌ Yechib olish uchun kamida ${minWithdraw} 💎 kerak.\nSizning balansingiz: ${user ? user.balance : 0} 💎`,
      mainMenu(isAdmin(ctx.from.id))
    );
    return ctx.scene.leave();
  }

  ctx.scene.session.balance = user.balance;
  ctx.scene.session.minWithdraw = minWithdraw;
  await ctx.reply(
    `🏦 Almazni yechish\n\n💰 Balansingiz: ${user.balance} 💎\n\nYechmoqchi bo'lgan olmos miqdorini kiriting (kamida ${minWithdraw}):`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

withdrawScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', mainMenu(isAdmin(ctx.from.id)));
  return ctx.scene.leave();
});

withdrawScene.on('text', async (ctx) => {
  const minWithdraw = ctx.scene.session.minWithdraw || 1000;
  const amount = Number(ctx.message.text.trim());

  if (!amount || isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Iltimos, to\'g\'ri raqam kiriting.');
  }
  if (amount < minWithdraw) {
    return ctx.reply(`❌ Minimal yechish miqdori ${minWithdraw} 💎.`);
  }
  if (amount > ctx.scene.session.balance) {
    return ctx.reply('❌ Balansingizda yetarli olmos yo\'q.');
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  user.balance -= amount;
  await user.save();

  const withdrawRequest = await Withdraw.create({
    telegramId: ctx.from.id,
    username: ctx.from.username || null,
    amount,
  });

  const settings = await getSettings();

  await ctx.reply(
    `✅ So'rovingiz qabul qilindi!\n\n💎 Miqdor: ${amount}\n⏳ Holat: ko'rib chiqilmoqda\n\nTasdiqlangach sizga xabar beriladi.`,
    mainMenu(isAdmin(ctx.from.id))
  );

  const adminText =
    `🆕 Yangi yechib olish so'rovi!\n\n` +
    `👤 @${ctx.from.username || 'nomaʼlum'} (ID: ${ctx.from.id})\n` +
    `📱 Tel: ${user.phone || 'nomaʼlum'}\n` +
    `💎 Miqdor: ${amount}`;

  const adminButtons = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `admin_approve_${withdrawRequest._id}`),
      Markup.button.callback('❌ Rad etish', `admin_reject_${withdrawRequest._id}`),
    ],
  ]);

  for (const adminId of ADMIN_IDS) {
    await ctx.telegram.sendMessage(adminId, adminText, adminButtons).catch(() => {});
  }

  if (settings.paymentsChannel) {
    const channelText =
      `📥 Yangi yechish so'rovi\n\n` +
      `👤 @${ctx.from.username || 'nomaʼlum'}\n` +
      `💎 Miqdor: ${amount}\n` +
      `⏳ Holat: Ko'rib chiqilmoqda`;
    await ctx.telegram
      .sendMessage(`@${settings.paymentsChannel}`, channelText)
      .catch((e) => console.error('Kanalga yozishda xato:', e.message));
  }

  return ctx.scene.leave();
});

module.exports = withdrawScene;
