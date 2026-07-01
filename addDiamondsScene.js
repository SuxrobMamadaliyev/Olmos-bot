const { Scenes, Markup } = require('telegraf');
const User = require('./User');
const { isAdmin } = require('./adminUtils');
const { adminBackKeyboard } = require('./keyboards');

const addDiamondsScene = new Scenes.BaseScene('addDiamondsScene');

addDiamondsScene.enter(async (ctx) => {
  ctx.scene.session.step = 'id';
  await ctx.reply(
    '💎 Olmosni qo\'shish\n\nFoydalanuvchining Telegram ID raqamini yuboring:',
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

addDiamondsScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

addDiamondsScene.on('text', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();

  if (ctx.scene.session.step === 'id') {
    const telegramId = Number(ctx.message.text.trim());
    if (!telegramId || isNaN(telegramId)) {
      return ctx.reply('❌ Noto\'g\'ri ID. Qaytadan kiriting yoki "❌ Bekor qilish" bosing.');
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      return ctx.reply('❌ Bunday foydalanuvchi topilmadi. Qaytadan kiriting.');
    }

    ctx.scene.session.targetId = telegramId;
    ctx.scene.session.targetName = `@${user.username || 'nomaʼlum'} (${telegramId})`;
    ctx.scene.session.step = 'amount';

    return ctx.reply(
      `👤 ${ctx.scene.session.targetName}\n💎 Joriy balansi: ${user.balance}\n\nQo'shmoqchi bo'lgan olmos miqdorini kiriting:`
    );
  }

  if (ctx.scene.session.step === 'amount') {
    const amount = Number(ctx.message.text.trim());
    if (!amount || isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Noto\'g\'ri miqdor. Musbat raqam kiriting.');
    }

    const user = await User.findOne({ telegramId: ctx.scene.session.targetId });
    user.balance += amount;
    user.totalEarned += amount;
    await user.save();

    // Foydalanuvchiga xabar
    await ctx.telegram
      .sendMessage(
        user.telegramId,
        `💎 Admindan: Hisobingizga <b>${amount} almaz</b> qo'shildi!\n📊 Joriy balansingiz: <b>${user.balance} 💎</b>`,
        { parse_mode: 'HTML' }
      )
      .catch(() => {});

    await ctx.reply(
      `✅ ${ctx.scene.session.targetName} ga ${amount} 💎 qo'shildi.\n📊 Yangi balansi: ${user.balance} 💎`,
      { reply_markup: { remove_keyboard: true } }
    );
    await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
    return ctx.scene.leave();
  }
});

module.exports = addDiamondsScene;
