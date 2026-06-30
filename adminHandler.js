const User = require('./User');
const Withdraw = require('./Withdraw');
const Channel = require('./Channel');
const { isAdmin } = require('./adminUtils');
const { adminMainKeyboard, adminChannelsKeyboard, adminBackKeyboard } = require('./keyboards');

const ADMIN_PANEL_TEXT = '🛠 *Admin panel*\n\nKerakli bo\'limni tanlang 👇';

// /admin - asosiy admin panel
async function adminPanelHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  return ctx.reply(ADMIN_PANEL_TEXT, { parse_mode: 'Markdown', ...adminMainKeyboard });
}

// "◀️ Orqaga" -> admin bosh menyu
async function adminBackAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.editMessageText(ADMIN_PANEL_TEXT, { parse_mode: 'Markdown', ...adminMainKeyboard }).catch(() =>
    ctx.reply(ADMIN_PANEL_TEXT, { parse_mode: 'Markdown', ...adminMainKeyboard })
  );
}

// 📊 Statistika
async function adminStatsAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();

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
    `📊 *Statistika*\n\n` +
    `👥 Jami foydalanuvchilar: ${totalUsers}\n` +
    `🚫 Bloklangan: ${blockedCount}\n` +
    `💎 Foydalanuvchilardagi joriy balans: ${totalDiamonds[0]?.sum || 0}\n` +
    `📈 Jami ishlangan olmos: ${totalEarned[0]?.sum || 0}\n` +
    `⏳ Kutilayotgan so'rovlar: ${pendingCount}\n` +
    `✅ Tasdiqlangan to'lovlar: ${approvedSum[0]?.sum || 0} 💎\n` +
    `📡 Majburiy kanallar soni: ${channelsCount}`;

  return ctx.editMessageText(text, { parse_mode: 'Markdown', ...adminBackKeyboard }).catch(() =>
    ctx.reply(text, { parse_mode: 'Markdown', ...adminBackKeyboard })
  );
}

// 📡 Majburiy kanallar ro'yxati
async function adminChannelsAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();

  const channels = await Channel.find().sort({ addedAt: 1 });
  const text =
    channels.length === 0
      ? `📡 *Majburiy kanallar*\n\nHozircha majburiy kanal qo'shilmagan.`
      : `📡 *Majburiy kanallar*\n\nO'chirish uchun kanal nomini bosing 👇\n\n` +
        channels.map((c, i) => `${i + 1}. ${c.title || c.username} (${c.username})`).join('\n');

  return ctx
    .editMessageText(text, { parse_mode: 'Markdown', ...adminChannelsKeyboard(channels) })
    .catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...adminChannelsKeyboard(channels) }));
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
  await Channel.findByIdAndDelete(id);
  await ctx.answerCbQuery('✅ Kanal o\'chirildi');

  const channels = await Channel.find().sort({ addedAt: 1 });
  const text =
    channels.length === 0
      ? `📡 *Majburiy kanallar*\n\nHozircha majburiy kanal qo'shilmagan.`
      : `📡 *Majburiy kanallar*\n\nO'chirish uchun kanal nomini bosing 👇\n\n` +
        channels.map((c, i) => `${i + 1}. ${c.title || c.username} (${c.username})`).join('\n');

  return ctx
    .editMessageText(text, { parse_mode: 'Markdown', ...adminChannelsKeyboard(channels) })
    .catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...adminChannelsKeyboard(channels) }));
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

// 📤 Broadcast
async function adminBroadcastAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  return ctx.scene.enter('broadcastScene');
}

// 👥 Foydalanuvchilar (so'nggi 10 ta)
async function adminUsersAction(ctx) {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();

  const totalUsers = await User.countDocuments();
  const lastUsers = await User.find().sort({ createdAt: -1 }).limit(10);

  const text =
    `👥 *Foydalanuvchilar*\n\nJami: ${totalUsers}\n\nSo'nggi 10 ta:\n\n` +
    lastUsers
      .map(
        (u, i) =>
          `${i + 1}. @${u.username || 'nomaʼlum'} (${u.telegramId}) — ${u.balance} 💎${u.isBlocked ? ' 🚫' : ''}`
      )
      .join('\n');

  return ctx
    .editMessageText(text, { parse_mode: 'Markdown', ...adminBackKeyboard })
    .catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...adminBackKeyboard }));
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
  adminBroadcastAction,
  adminUsersAction,
  pendingHandler,
  approveHandler,
  rejectHandler,
  broadcastHandler,
};
