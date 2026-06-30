const { Scenes, Markup } = require('telegraf');
const User = require('./User');
const Withdraw = require('./Withdraw');
const { mainMenu } = require('./keyboards');

const MIN_WITHDRAW = Number(process.env.MIN_WITHDRAW || 1000);
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter(Boolean);

const withdrawScene = new Scenes.BaseScene('withdrawScene');

withdrawScene.enter(async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user || user.balance < MIN_WITHDRAW) {
    await ctx.reply(
      `🏦 Almazni yechish\n\n❌ Yechib olish uchun kamida ${MIN_WITHDRAW} 💎 kerak.\nSizning balansingiz: ${user ? user.balance : 0} 💎`,
      mainMenu
    );
    return ctx.scene.leave();
  }

  ctx.scene.session.balance = user.balance;
  await ctx.reply(
    `🏦 Almazni yechish\n\n💰 Balansingiz: ${user.balance} 💎\n\nYechmoqchi bo'lgan olmos miqdorini kiriting (kamida ${MIN_WITHDRAW}):`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

withdrawScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', mainMenu);
  return ctx.scene.leave();
});

withdrawScene.on('text', async (ctx) => {
  const amount = Number(ctx.message.text.trim());

  if (!amount || isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Iltimos, to\'g\'ri raqam kiriting.');
  }

  if (amount < MIN_WITHDRAW) {
    return ctx.reply(`❌ Minimal yechish miqdori ${MIN_WITHDRAW} 💎.`);
  }

  if (amount > ctx.scene.session.balance) {
    return ctx.reply('❌ Balansingizda yetarli olmos yo\'q.');
  }

  // Balansdan vaqtincha "band qilish" - so'rov tasdiqlanguncha yechib qo'yamiz,
  // rad etilsa qaytarib beramiz
  const user = await User.findOne({ telegramId: ctx.from.id });
  user.balance -= amount;
  await user.save();

  const withdrawRequest = await Withdraw.create({
    telegramId: ctx.from.id,
    username: ctx.from.username || null,
    amount,
  });

  await ctx.reply(
    `✅ So'rovingiz qabul qilindi!\n\n💎 Miqdor: ${amount}\n⏳ Holat: ko'rib chiqilmoqda\n\nTasdiqlangach sizga xabar beriladi.`,
    mainMenu
  );

  // Adminlarga xabar yuborish
  for (const adminId of ADMIN_IDS) {
    await ctx.telegram
      .sendMessage(
        adminId,
        `🆕 Yangi yechib olish so'rovi!\n\n👤 @${ctx.from.username || 'nomaʼlum'} (ID: ${ctx.from.id})\n💎 Miqdor: ${amount}\n\nTasdiqlash: /approve_${withdrawRequest._id}\nRad etish: /reject_${withdrawRequest._id}`
      )
      .catch(() => {});
  }

  return ctx.scene.leave();
});

module.exports = withdrawScene;
