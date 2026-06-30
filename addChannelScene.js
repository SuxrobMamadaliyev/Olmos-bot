const { Scenes, Markup } = require('telegraf');
const Channel = require('./Channel');
const { isAdmin } = require('./adminUtils');
const { adminBackKeyboard } = require('./keyboards');

const addChannelScene = new Scenes.BaseScene('addChannelScene');

addChannelScene.enter(async (ctx) => {
  await ctx.reply(
    `➕ Yangi majburiy kanal qo'shish\n\n` +
      `Kanal username'ini yuboring (masalan: @mychannel)\n` +
      `yoki kanal ID raqamini (masalan: -1001234567890)\n\n` +
      `⚠️ Bot kanalda ADMIN bo'lishi shart!`,
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

addChannelScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.');
  return ctx.scene.leave();
});

addChannelScene.on('text', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();

  let input = ctx.message.text.trim();
  input = input.replace('https://t.me/', '').replace('@', '');

  if (!input) {
    return ctx.reply('❌ Noto\'g\'ri format. Qaytadan urinib ko\'ring yoki "❌ Bekor qilish" bosing.');
  }

  const isNumericId = /^-?\d+$/.test(input);
  const usernameToSave = isNumericId ? input : input;

  const exists = await Channel.findOne({ username: usernameToSave });
  if (exists) {
    await ctx.reply('⚠️ Bu kanal allaqachon ro\'yxatda mavjud.', { reply_markup: { remove_keyboard: true } });
    return ctx.scene.leave();
  }

  // Kanal mavjudligini va bot admin ekanligini tekshirish
  let title = null;
  try {
    const chatId = isNumericId ? input : `@${input}`;
    const chat = await ctx.telegram.getChat(chatId);
    title = chat.title || null;

    const me = await ctx.telegram.getMe();
    const botMember = await ctx.telegram.getChatMember(chatId, me.id);
    if (!['administrator', 'creator'].includes(botMember.status)) {
      await ctx.reply(
        '⚠️ Diqqat: bot ushbu kanalda ADMIN emas. Obuna tekshiruvi ishlamasligi mumkin.\n' +
          'Baribir kanal ro\'yxatga qo\'shildi, lekin botni kanalga admin qilishni unutmang.'
      );
    }
  } catch (err) {
    await ctx.reply(
      '⚠️ Diqqat: kanal topilmadi yoki bot kanalga kira olmadi. Baribir ro\'yxatga qo\'shilmoqda.\n' +
        'Username/ID to\'g\'riligini va botning kanalda admin ekanligini tekshiring.'
    );
  }

  await Channel.create({ username: usernameToSave, title });

  await ctx.reply(`✅ Kanal qo'shildi: ${title || usernameToSave}`, { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

module.exports = addChannelScene;
