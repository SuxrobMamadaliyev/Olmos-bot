const User = require('./User');
const Withdraw = require('./Withdraw');

const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter(Boolean);

function isAdmin(telegramId) {
  return ADMIN_IDS.includes(telegramId);
}

// /admin - asosiy admin panel
async function adminPanelHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const totalUsers = await User.countDocuments();
  const totalDiamonds = await User.aggregate([
    { $group: { _id: null, sum: { $sum: '$balance' } } },
  ]);
  const pendingWithdraws = await Withdraw.countDocuments({ status: 'pending' });
  const totalWithdrawn = await Withdraw.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);

  return ctx.reply(
    `🛠 Admin panel\n\n` +
      `👥 Jami foydalanuvchilar: ${totalUsers}\n` +
      `💎 Foydalanuvchilardagi umumiy balans: ${totalDiamonds[0]?.sum || 0}\n` +
      `⏳ Kutilayotgan so'rovlar: ${pendingWithdraws}\n` +
      `✅ Tasdiqlangan to'lovlar: ${totalWithdrawn[0]?.sum || 0} 💎\n\n` +
      `Buyruqlar:\n` +
      `/pending — kutilayotgan so'rovlar ro'yxati\n` +
      `/broadcast <matn> — barcha foydalanuvchilarga xabar yuborish`
  );
}

// /pending - kutilayotgan withdraw so'rovlari
async function pendingHandler(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const pending = await Withdraw.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(20);

  if (pending.length === 0) {
    return ctx.reply('✅ Kutilayotgan so\'rovlar yo\'q.');
  }

  for (const w of pending) {
    await ctx.reply(
      `🆔 ${w._id}\n👤 @${w.username || 'nomaʼlum'} (${w.telegramId})\n💎 ${w.amount}\n\n` +
        `/approve_${w._id}\n/reject_${w._id}`
    );
  }
}

// /approve_<id>
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

// /reject_<id>
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

  // pulni qaytarib beramiz
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

// /broadcast <matn>
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
  pendingHandler,
  approveHandler,
  rejectHandler,
  broadcastHandler,
};
