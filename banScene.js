const { Scenes, Markup } = require('telegraf');
const User = require('./User');
const { isAdmin } = require('./adminUtils');
const { adminBackKeyboard } = require('./keyboards');

const banScene = new Scenes.BaseScene('banScene');

banScene.enter(async (ctx) => {
  await ctx.reply(
    `🚫 Bloklash uchun foydalanuvchining Telegram ID raqamini yuboring:`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

banScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

banScene.on('text', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();

  const telegramId = Number(ctx.message.text.trim());
  if (!telegramId || isNaN(telegramId)) {
    return ctx.reply('❌ Noto\'g\'ri ID. Qaytadan urinib ko\'ring yoki "❌ Bekor qilish" bosing.');
  }

  const user = await User.findOne({ telegramId });
  if (!user) {
    await ctx.reply('❌ Bunday foydalanuvchi topilmadi.', { reply_markup: { remove_keyboard: true } });
    return ctx.scene.leave();
  }

  if (user.isBlocked) {
    await ctx.reply(`⚠️ Foydalanuvchi allaqachon bloklangan: @${user.username || 'nomaʼlum'} (${telegramId})`, {
      reply_markup: { remove_keyboard: true },
    });
  } else {
    user.isBlocked = true;
    await user.save();
    await ctx.reply(`✅ Foydalanuvchi bloklandi: @${user.username || 'nomaʼlum'} (${telegramId})`, {
      reply_markup: { remove_keyboard: true },
    });
  }

  await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
  return ctx.scene.leave();
});

module.exports = banScene;
