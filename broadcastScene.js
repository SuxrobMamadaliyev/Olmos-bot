const { Scenes, Markup } = require('telegraf');
const User = require('./User');
const { isAdmin } = require('./adminUtils');

const broadcastScene = new Scenes.BaseScene('broadcastScene');

broadcastScene.enter(async (ctx) => {
  await ctx.reply(
    `📤 Barcha foydalanuvchilarga yuboriladigan xabarni kiriting\n\n(matn, rasm, video va h.k. yuborishingiz mumkin)`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

broadcastScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.');
  return ctx.scene.leave();
});

broadcastScene.on('message', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();
  if (ctx.message.text === '❌ Bekor qilish') return;

  const users = await User.find({}, { telegramId: 1 });
  let sent = 0;
  let failed = 0;

  await ctx.reply(`📤 ${users.length} foydalanuvchiga yuborilmoqda...`, { reply_markup: { remove_keyboard: true } });

  for (const u of users) {
    try {
      await ctx.telegram.copyMessage(u.telegramId, ctx.chat.id, ctx.message.message_id);
      sent++;
    } catch {
      failed++;
    }
  }

  await ctx.reply(`✅ Yuborildi: ${sent}\n❌ Xato: ${failed}`);
  return ctx.scene.leave();
});

module.exports = broadcastScene;
