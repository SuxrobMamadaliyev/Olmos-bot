const { Scenes, Markup } = require('telegraf');
const { isAdmin } = require('./adminUtils');
const { getSettings, updateSetting } = require('./settingsUtils');
const { adminBackKeyboard } = require('./keyboards');

const changeMinWithdrawScene = new Scenes.BaseScene('changeMinWithdrawScene');

changeMinWithdrawScene.enter(async (ctx) => {
  const settings = await getSettings();
  await ctx.reply(
    `💸 Minimal yechishni o'zgartirish\n\n` +
      `Joriy minimal yechish: ${settings.minWithdraw} 💎\n\n` +
      `Yangi minimal miqdorni kiriting (faqat raqam):`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

changeMinWithdrawScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

changeMinWithdrawScene.on('text', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();

  const value = Number(ctx.message.text.trim());
  if (!value || isNaN(value) || value <= 0) {
    return ctx.reply('❌ Noto\'g\'ri raqam. Musbat raqam kiriting yoki "❌ Bekor qilish" bosing.');
  }

  await updateSetting('minWithdraw', value);

  await ctx.reply(`✅ Minimal yechish miqdori yangilandi: ${value} 💎`, {
    reply_markup: { remove_keyboard: true },
  });
  await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
  return ctx.scene.leave();
});

module.exports = changeMinWithdrawScene;
