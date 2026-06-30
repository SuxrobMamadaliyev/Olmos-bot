const { Scenes, Markup } = require('telegraf');
const { isAdmin } = require('./adminUtils');
const { getSettings, updateSetting } = require('./settingsUtils');
const { adminBackKeyboard } = require('./keyboards');

const changePaymentsChannelScene = new Scenes.BaseScene('changePaymentsChannelScene');

changePaymentsChannelScene.enter(async (ctx) => {
  const settings = await getSettings();
  await ctx.reply(
    `📣 To'lovlar kanalini o'zgartirish\n\n` +
      `Joriy kanal: @${settings.paymentsChannel}\n\n` +
      `Yangi kanal username'ini yuboring (masalan: @mychannel yoki mychannel):`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

changePaymentsChannelScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

changePaymentsChannelScene.on('text', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();

  const input = ctx.message.text.trim().replace('https://t.me/', '').replace('@', '');
  if (!input) {
    return ctx.reply('❌ Noto\'g\'ri format. Qaytadan urinib ko\'ring yoki "❌ Bekor qilish" bosing.');
  }

  await updateSetting('paymentsChannel', input);

  await ctx.reply(`✅ To'lovlar kanali yangilandi: @${input}`, { reply_markup: { remove_keyboard: true } });
  await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
  return ctx.scene.leave();
});

module.exports = changePaymentsChannelScene;
