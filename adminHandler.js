const User = require('./User');
const Withdraw = require('./Withdraw');
const Channel = require('./Channel');
const PromoCode = require('./PromoCode');
const { isAdmin } = require('./adminUtils');
const { adminMainKeyboard, adminChannelsKeyboard, adminBackKeyboard } = require('./keyboards');
const { buildPromoText, buildPromoKeyboard } = require('./promoUtils');

// HTML rejimida maxsus belgilarni ekranlash. Markdown o'rniga HTML ishlatamiz,
// chunki kanal/foydalanuvchi username'laridagi "_" kabi belgilar legacy Markdown
// parserini buzib, xabarni butunlay yuborilmay qoldirishi mumkin edi (jim xato).
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Har doim ishlaydigan answerCbQuery - eskirgan callback query funksiyani
// to'liq to'xtatib qo'ymasligi uchun himoyalangan.
async function safeAnswerCbQuery(ctx, ...args) {
  try {
    await ctx.answerCbQuery(...args);
  } catch (err) {
    console.error('answerCbQuery xatosi:', err.message);
  }
}

const ADMIN_PANEL_TEXT_HTML = '🛠 <b>Admin panel</b>\n\nKerakli bo\'limni tanlang 👇';

// /admin - asosiy admin panel
async function adminPanelHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  return ctx.reply(ADMIN_PANEL_TEXT_HTML, { parse_mode: 'HTML', ...adminMainKeyboard });
}

// "◀️ Orqaga" -> admin bosh menyu
async function adminBackAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await safeAnswerCbQuery(ctx);
  return ctx.editMessageText(ADMIN_PANEL_TEXT_HTML, { parse_mode: 'HTML', ...adminMainKeyboard }).catch((err) => {
    console.error('adminBackAction xatosi:', err.message);
    return ctx.reply(ADMIN_PANEL_TEXT_HTML, { parse_mode: 'HTML', ...adminMainKeyboard });
  });
}

// 📊 Statistika
async function adminStatsAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await safeAnswerCbQuery(ctx);

  const totalUsers = await User.countDocuments();
  const totalDiamonds = await User.aggregate([{ $group: { _id: null, sum: { $sum: '$balance' } } }]);
  const totalEarned = await User.aggregate([{ $group: { _id: null, sum: { $sum: '$totalEarned' } } }]);
  const pendingCount = await Withdraw.countDocuments({ status: 'pending' });
  const approvedSum = await Withdraw.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const blockedCount = await User.countDocuments({ isBlocked: true });
  const channelsCount = await Channel.countDocuments();

  const text =
    `📊 <b>Statistika</b>\n\n` +
    `👥 Jami foydalanuvchilar: ${totalUsers}\n` +
    `🚫 Bloklangan: ${blockedCount}\n` +
    `💎 Foydalanuvchilardagi joriy balans: ${totalDiamonds[0]?.sum || 0}\n` +
    `📈 Jami ishlangan olmos: ${totalEarned[0]?.sum || 0}\n` +
    `⏳ Kutilayotgan so'rovlar: ${pendingCount}\n` +
    `✅ Tasdiqlangan to'lovlar: ${approvedSum[0]?.sum || 0} 💎\n` +
    `📡 Majburiy kanallar soni: ${channelsCount}`;

  return ctx.editMessageText(text, { parse_mode: 'HTML', ...adminBackKeyboard }).catch((err) => {
    console.error('adminStatsAction xatosi:', err.message);
    return ctx.reply(text, { parse_mode: 'HTML', ...adminBackKeyboard });
  });
}

// 📡 Majburiy kanallar ro'yxati
function buildChannelsText(channels) {
  return channels.length === 0
    ? `📡 <b>Majburiy kanallar</b>\n\nHozircha majburiy kanal qo'shilmagan.`
    : `📡 <b>Majburiy kanallar</b>\n\nO'chirish uchun kanal nomini bosing 👇\n\n` +
      channels
        .map((c, i) => `${i + 1}. ${escapeHtml(c.title || c.username)} (${escapeHtml(c.username)})`)
        .join('\n');
}

async function adminChannelsAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await safeAnswerCbQuery(ctx);

  let channels;
  try {
    channels = await Channel.find().sort({ addedAt: 1 });
  } catch (err) {
    console.error('Channel.find() xatosi:', err);
    return ctx.reply('❌ Kanallar ro\'yxatini olishda xatolik yuz berdi. Serverdagi loglarni tekshiring.');
  }

  const text = buildChannelsText(channels);

  return ctx
    .editMessageText(text, { parse_mode: 'HTML', ...adminChannelsKeyboard(channels) })
    .catch((err) => {
      console.error('adminChannelsAction editMessageText xatosi:', err.message);
      return ctx.reply(text, { parse_mode: 'HTML', ...adminChannelsKeyboard(channels) }).catch((err2) => {
        console.error('adminChannelsAction reply xatosi:', err2.message);
      });
    });
}

// ➕ Kanal qo'shish
async function adminChannelAddAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('addChannelScene');
}

// 🗑 Kanalni o'chirish
async function adminChannelDeleteAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.match[1];

  try {
    await Channel.findByIdAndDelete(id);
  } catch (err) {
    console.error('Channel.findByIdAndDelete xatosi:', err);
  }
  await safeAnswerCbQuery(ctx, '✅ Kanal o\'chirildi');

  const channels = await Channel.find().sort({ addedAt: 1 });
  const text = buildChannelsText(channels);

  return ctx
    .editMessageText(text, { parse_mode: 'HTML', ...adminChannelsKeyboard(channels) })
    .catch((err) => {
      console.error('adminChannelDeleteAction editMessageText xatosi:', err.message);
      return ctx.reply(text, { parse_mode: 'HTML', ...adminChannelsKeyboard(channels) }).catch((err2) => {
        console.error('adminChannelDeleteAction reply xatosi:', err2.message);
      });
    });
}

// ⏳ Kutilayotgan so'rovlar
async function adminPendingAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();

  const pending = await Withdraw.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(20);

  if (pending.length === 0) {
    return ctx
      .editMessageText('✅ Kutilayotgan so\'rovlar yo\'q.', adminBackKeyboard)
      .catch(() => ctx.reply('✅ Kutilayotgan so\'rovlar yo\'q.', adminBackKeyboard));
  }

  await ctx.deleteMessage().catch(() => {});

  for (const w of pending) {
    const { Markup } = require('telegraf');
    await ctx.reply(
      `🆔 ${w._id}\n👤 @${w.username || 'nomaʼlum'} (${w.telegramId})\n💎 ${w.amount}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Tasdiqlash', `admin_approve_${w._id}`),
          Markup.button.callback('❌ Rad etish', `admin_reject_${w._id}`),
        ],
      ])
    );
  }

  return ctx.reply('Bosh menyuga qaytish:', adminBackKeyboard);
}

// ✅ Tasdiqlash (inline)
async function adminApproveAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.match[1];

  const withdrawReq = await Withdraw.findById(id);
  if (!withdrawReq || withdrawReq.status !== 'pending') {
    return ctx.answerCbQuery('❌ So\'rov topilmadi yoki allaqachon ko\'rib chiqilgan.', { show_alert: true });
  }

  withdrawReq.status = 'approved';
  withdrawReq.resolvedAt = new Date();
  await withdrawReq.save();

  const user = await User.findOne({ telegramId: withdrawReq.telegramId });
  if (user) {
    user.totalWithdrawn += withdrawReq.amount;
    await user.save();
  }

  await ctx.answerCbQuery('✅ Tasdiqlandi');
  await ctx.editMessageText(`✅ Tasdiqlandi (${withdrawReq.amount} 💎) — @${withdrawReq.username || 'nomaʼlum'}`);
  await ctx.telegram
    .sendMessage(withdrawReq.telegramId, `✅ Sizning ${withdrawReq.amount} 💎 yechib olish so'rovingiz tasdiqlandi!`)
    .catch(() => {});
}

// ❌ Rad etish (inline)
async function adminRejectAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.match[1];

  const withdrawReq = await Withdraw.findById(id);
  if (!withdrawReq || withdrawReq.status !== 'pending') {
    return ctx.answerCbQuery('❌ So\'rov topilmadi yoki allaqachon ko\'rib chiqilgan.', { show_alert: true });
  }

  withdrawReq.status = 'rejected';
  withdrawReq.resolvedAt = new Date();
  await withdrawReq.save();

  const user = await User.findOne({ telegramId: withdrawReq.telegramId });
  if (user) {
    user.balance += withdrawReq.amount;
    await user.save();
  }

  await ctx.answerCbQuery('❌ Rad etildi');
  await ctx.editMessageText(`❌ Rad etildi, balans qaytarildi (${withdrawReq.amount} 💎) — @${withdrawReq.username || 'nomaʼlum'}`);
  await ctx.telegram
    .sendMessage(withdrawReq.telegramId, `❌ Sizning ${withdrawReq.amount} 💎 yechib olish so'rovingiz rad etildi. Balansingiz qaytarildi.`)
    .catch(() => {});
}

// ➕ Olmos qo'shish
async function adminAddDiamondsAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('addDiamondsScene');
}

// ➖ Olmos ayirish
async function adminRemoveDiamondsAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('removeDiamondsScene');
}

// 🚫 Ban berish
async function adminBanAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('banScene');
}

// ✅ Banni olish
async function adminUnbanAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('unbanScene');
}

// 💸 Minimal yechishni o'zgartirish
async function adminMinWithdrawAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('changeMinWithdrawScene');
}

// 📣 To'lovlar kanalini o'zgartirish
async function adminPaymentsChannelAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('changePaymentsChannelScene');
}

// 💎 Referal narxini o'zgartirish
async function adminReferralRewardAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('changeReferralRewardScene');
}

// 🎁 Promokod yaratish
async function adminAddPromoAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('addPromoScene');
}

// 🎁 Foydalanuvchi kanaldagi "Promokodni olish" tugmasini bosganda ishlaydi
async function promoClaimAction(ctx) {
  const code = ctx.match[1];

  const promo = await PromoCode.findOne({ code });
  if (!promo) {
    return ctx.answerCbQuery('❌ Promokod topilmadi.', { show_alert: true });
  }

  if (!promo.isActive || promo.usedCount >= promo.limit) {
    return ctx.answerCbQuery('⛔️ Bu promokod allaqachon tugagan!', { show_alert: true });
  }

  if (promo.usedBy.includes(ctx.from.id)) {
    return ctx.answerCbQuery('❗️ Siz bu promokodni allaqachon ishlatgansiz.', { show_alert: true });
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    return ctx.answerCbQuery('❗️ Avval botni ishga tushiring: /start', { show_alert: true });
  }

  if (user.isBlocked) {
    return ctx.answerCbQuery('🚫 Siz botdan foydalanishdan bloklangansiz.', { show_alert: true });
  }

  // Balansni yangilash
  user.balance += promo.amount;
  user.totalEarned += promo.amount;
  await user.save();

  // Promokodni yangilash
  promo.usedBy.push(ctx.from.id);
  promo.usedCount += 1;
  if (promo.usedCount >= promo.limit) {
    promo.isActive = false;
  }
  await promo.save();

  await ctx.answerCbQuery(`✅ Sizga ${promo.amount} 💎 qo'shildi!`, { show_alert: true });

  // Kanaldagi xabarni yangilash (limit va holatni yangilash)
  const text = buildPromoText(promo);
  const keyboard = buildPromoKeyboard(promo);
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch((err) => {
    console.error('promoClaimAction editMessageText xatosi:', err.message);
  });

  await ctx.telegram
    .sendMessage(user.telegramId, `🎁 "${promo.code}" promokodi orqali <b>${promo.amount} 💎</b> hisobingizga qo'shildi!`, {
      parse_mode: 'HTML',
    })
    .catch(() => {});
}

// 📤 Broadcast
async function adminBroadcastAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('broadcastScene');
}

// 👥 Foydalanuvchilar (so'nggi 10 ta)
async function adminUsersAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await safeAnswerCbQuery(ctx);

  const totalUsers = await User.countDocuments();
  const lastUsers = await User.find().sort({ createdAt: -1 }).limit(10);

  const text =
    `👥 <b>Foydalanuvchilar</b>\n\nJami: ${totalUsers}\n\nSo'nggi 10 ta:\n\n` +
    lastUsers
      .map(
        (u, i) =>
          `${i + 1}. @${escapeHtml(u.username || 'nomaʼlum')} (${u.telegramId}) — ${u.balance} 💎${u.isBlocked ? ' 🚫' : ''}`
      )
      .join('\n');

  return ctx.editMessageText(text, { parse_mode: 'HTML', ...adminBackKeyboard }).catch((err) => {
    console.error('adminUsersAction xatosi:', err.message);
    return ctx.reply(text, { parse_mode: 'HTML', ...adminBackKeyboard });
  });
}

// /pending - matnli buyruq (eski usul, moslik uchun)
async function pendingHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  return adminPendingAction({ ...ctx, answerCbQuery: () => {} });
}

// /approve_<id> - matnli buyruq (eski usul, moslik uchun)
async function approveHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.message.text.replace('/approve_', '');

  const withdrawReq = await Withdraw.findById(id);
  if (!withdrawReq || withdrawReq.status !== 'pending') {
    return ctx.reply('❌ So\'rov topilmadi yoki allaqachon ko\'rib chiqilgan.');
  }

  withdrawReq.status = 'approved';
  withdrawReq.resolvedAt = new Date();
  await withdrawReq.save();

  const user = await User.findOne({ telegramId: withdrawReq.telegramId });
  if (user) {
    user.totalWithdrawn += withdrawReq.amount;
    await user.save();
  }

  await ctx.reply(`✅ So'rov tasdiqlandi (${withdrawReq.amount} 💎)`);
  await ctx.telegram
    .sendMessage(withdrawReq.telegramId, `✅ Sizning ${withdrawReq.amount} 💎 yechib olish so'rovingiz tasdiqlandi!`)
    .catch(() => {});
}

// /reject_<id> - matnli buyruq (eski usul, moslik uchun)
async function rejectHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.message.text.replace('/reject_', '');

  const withdrawReq = await Withdraw.findById(id);
  if (!withdrawReq || withdrawReq.status !== 'pending') {
    return ctx.reply('❌ So\'rov topilmadi yoki allaqachon ko\'rib chiqilgan.');
  }

  withdrawReq.status = 'rejected';
  withdrawReq.resolvedAt = new Date();
  await withdrawReq.save();

  const user = await User.findOne({ telegramId: withdrawReq.telegramId });
  if (user) {
    user.balance += withdrawReq.amount;
    await user.save();
  }

  await ctx.reply(`❌ So'rov rad etildi, balans qaytarildi (${withdrawReq.amount} 💎)`);
  await ctx.telegram
    .sendMessage(withdrawReq.telegramId, `❌ Sizning ${withdrawReq.amount} 💎 yechib olish so'rovingiz rad etildi. Balansingiz qaytarildi.`)
    .catch(() => {});
}

// /broadcast <matn> - matnli buyruq (eski usul, moslik uchun)
async function broadcastHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const text = ctx.message.text.replace('/broadcast', '').trim();
  if (!text) return ctx.reply('Foydalanish: /broadcast <xabar matni>');

  const users = await User.find({}, { telegramId: 1 });
  let sent = 0;
  let failed = 0;

  await ctx.reply(`📤 ${users.length} foydalanuvchiga yuborilmoqda...`);

  for (const u of users) {
    try {
      await ctx.telegram.sendMessage(u.telegramId, text);
      sent++;
    } catch {
      failed++;
    }
  }

  return ctx.reply(`✅ Yuborildi: ${sent}\n❌ Xato: ${failed}`);
}

module.exports = {
  isAdmin,
  adminPanelHandler,
  adminBackAction,
  adminStatsAction,
  adminChannelsAction,
  adminChannelAddAction,
  adminChannelDeleteAction,
  adminPendingAction,
  adminApproveAction,
  adminRejectAction,
  adminBanAction,
  adminUnbanAction,
  adminAddDiamondsAction,
  adminRemoveDiamondsAction,
  adminMinWithdrawAction,
  adminPaymentsChannelAction,
  adminReferralRewardAction,
  adminBroadcastAction,
  adminUsersAction,
  adminAddPromoAction,
  promoClaimAction,
  pendingHandler,
  approveHandler,
  rejectHandler,
  broadcastHandler,
};
