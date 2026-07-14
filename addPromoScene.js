const { Scenes, Markup } = require('telegraf');
const PromoCode = require('./PromoCode');
const { isAdmin } = require('./adminUtils');
const { getSettings } = require('./settingsUtils');
const { adminBackKeyboard } = require('./keyboards');
const { buildPromoText, buildPromoKeyboard, generateRandomCode } = require('./promoUtils');

const addPromoScene = new Scenes.BaseScene('addPromoScene');

const codeStepKeyboard = Markup.keyboard([['🎲 Avto yaratish'], ['❌ Bekor qilish']]).resize();
const cancelKeyboard = Markup.keyboard([['❌ Bekor qilish']]).resize();

addPromoScene.enter(async (ctx) => {
  ctx.scene.session.step = 'code';
  await ctx.reply(
    `🎁 Yangi promokod yaratish\n\n` +
      `🏷 Promokod matnini kiriting (masalan: BONUS2026)\n` +
      `yoki tasodifiy kod uchun "🎲 Avto yaratish" tugmasini bosing:`,
    codeStepKeyboard
  );
});

addPromoScene.hears('❌ Bekor qilish', async (ctx) => {
  await ctx.reply('Bekor qilindi.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

addPromoScene.hears('🎲 Avto yaratish', async (ctx) => {
  if (ctx.scene.session.step !== 'code') return;

  let code;
  let exists = true;
  // Takrorlanmas kod topilguncha urinib ko'ramiz
  for (let i = 0; i < 10 && exists; i++) {
    code = generateRandomCode();
    exists = await PromoCode.exists({ code });
  }
  if (exists) {
    return ctx.reply('❌ Tasodifiy kod yaratib bo\'lmadi, qaytadan urinib ko\'ring.');
  }

  ctx.scene.session.code = code;
  ctx.scene.session.step = 'amount';
  return ctx.reply(
    `✅ Promokod: ${code}\n\n💎 Har bir foydalanuvchiga beriladigan olmos miqdorini kiriting:`,
    cancelKeyboard
  );
});

addPromoScene.on('text', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.scene.leave();

  const step = ctx.scene.session.step;

  if (step === 'code') {
    const code = ctx.message.text.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
      return ctx.reply('❌ Noto\'g\'ri format. Faqat harf/raqam (3-20 belgi) kiriting yoki "🎲 Avto yaratish" bosing.');
    }

    const exists = await PromoCode.exists({ code });
    if (exists) {
      return ctx.reply('❌ Bunday promokod allaqachon mavjud. Boshqa kod kiriting.');
    }

    ctx.scene.session.code = code;
    ctx.scene.session.step = 'amount';
    return ctx.reply(`✅ Promokod: ${code}\n\n💎 Har bir foydalanuvchiga beriladigan olmos miqdorini kiriting:`, cancelKeyboard);
  }

  if (step === 'amount') {
    const amount = Number(ctx.message.text.trim());
    if (!amount || isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return ctx.reply('❌ Noto\'g\'ri miqdor. Musbat butun son kiriting.');
    }

    ctx.scene.session.amount = amount;
    ctx.scene.session.step = 'limit';
    return ctx.reply(`👥 Promokodni jami nechta kishi ishlata olishi kerak? (Limit):`, cancelKeyboard);
  }

  if (step === 'limit') {
    const limit = Number(ctx.message.text.trim());
    if (!limit || isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) {
      return ctx.reply('❌ Noto\'g\'ri limit. Musbat butun son kiriting.');
    }

    const settings = await getSettings();
    if (!settings.paymentsChannel) {
      await ctx.reply('❌ Avval "To\'lovlar kanali" sozlanmagan. Admin panelda kanalni belgilang.', {
        reply_markup: { remove_keyboard: true },
      });
      await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
      return ctx.scene.leave();
    }

    let promo;
    try {
      promo = await PromoCode.create({
        code: ctx.scene.session.code,
        amount: ctx.scene.session.amount,
        limit,
        usedCount: 0,
        usedBy: [],
        isActive: true,
      });
    } catch (err) {
      console.error('PromoCode.create xatosi:', err);
      await ctx.reply('❌ Promokod yaratishda xatolik yuz berdi (kod band bo\'lishi mumkin).', {
        reply_markup: { remove_keyboard: true },
      });
      await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
      return ctx.scene.leave();
    }

    const text = buildPromoText(promo);
    const keyboard = buildPromoKeyboard(promo);

    try {
      const sent = await ctx.telegram.sendMessage(`@${settings.paymentsChannel}`, text, {
        parse_mode: 'HTML',
        ...keyboard,
      });
      promo.channelChatId = sent.chat.id;
      promo.channelMessageId = sent.message_id;
      await promo.save();

      await ctx.reply(
        `✅ Promokod yaratildi va kanalga joylandi!\n\n` +
          `🏷 Kod: ${promo.code}\n💎 Bonus: ${promo.amount} 💎\n👥 Limit: ${promo.limit}`,
        { reply_markup: { remove_keyboard: true } }
      );
    } catch (err) {
      console.error('Promokodni kanalga yuborishda xato:', err.message);
      await ctx.reply(
        `⚠️ Promokod bazada yaratildi, lekin kanalga yuborilmadi.\n` +
          `Bot @${settings.paymentsChannel} kanalida admin ekanligiga ishonch hosil qiling.\n\nXato: ${err.message}`,
        { reply_markup: { remove_keyboard: true } }
      );
    }

    await ctx.reply('🛠 Admin panel:', adminBackKeyboard);
    return ctx.scene.leave();
  }
});

module.exports = addPromoScene;
