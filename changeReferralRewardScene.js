const { Scenes, Markup } = require('telegraf');
const { isAdmin } = require('./adminUtils');
const { getSettings, updateSetting } = require('./settingsUtils');
const { adminBackKeyboard } = require('./keyboards');

const changeReferralRewardScene = new Scenes.BaseScene('changeReferralRewardScene');

changeReferralRewardScene.enter(async (ctx) => {
  const settings = await getSettings();
  await ctx.reply(
    `💎 Referal narxini o'zgartirish\n\n` +
      `Joriy narx: ${settings.referralReward} 💎\n\n` +
      `Yangi narxni kiriting (faqat raqam):`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

changeReferralRewardScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

changeReferralRewardScene.on('text', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();

  const value = Number(ctx.message.text.trim());
  if (!value || isNaN(value) || value <= 0) {
    return ctx.reply('❌ Noto\'g\'ri raqam. Qaytadan urinib ko\'ring yoki "❌ Bekor qilish" bosing.');
  }

  await updateSetting('referralReward', value);

  await ctx.reply(`✅ Referal narxi yangilandi: ${value} 💎`, { reply_markup: { remove_keyboard: true } });
  await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
  return ctx.scene.leave();
});

module.exports = changeReferralRewardScene;
