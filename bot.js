const { Telegraf, Scenes, session } = require('telegraf');

const { startHandler, checkSubscriptionHandler, phoneContactHandler } = require('./startHandler');
const {
  earnHandler, balanceHandler, guideHandler, paymentsChannelHandler, supportHandler,
} = require('./menuHandler');
const {
  isAdmin,
  adminPanelHandler, adminBackAction, adminStatsAction,
  adminChannelsAction, adminChannelAddAction, adminChannelDeleteAction,
  adminPendingAction, adminApproveAction, adminRejectAction,
  adminBanAction, adminUnbanAction,
  adminAddDiamondsAction, adminRemoveDiamondsAction,
  adminMinWithdrawAction, adminPaymentsChannelAction, adminReferralRewardAction,
  adminBroadcastAction, adminUsersAction,
  pendingHandler, approveHandler, rejectHandler, broadcastHandler,
} = require('./adminHandler');
const User = require('./User');
const { mainMenu, subscribeKeyboard } = require('./keyboards');
const { checkAllSubscriptions } = require('./subscription');
const { applyLeavePenalty, clearBotBlockedFlag } = require('./referralPenalty');

const withdrawScene = require('./withdrawScene');
const addChannelScene = require('./addChannelScene');
const broadcastScene = require('./broadcastScene');
const banScene = require('./banScene');
const unbanScene = require('./unbanScene');
const addDiamondsScene = require('./addDiamondsScene');
const removeDiamondsScene = require('./removeDiamondsScene');
const changeMinWithdrawScene = require('./changeMinWithdrawScene');
const changePaymentsChannelScene = require('./changePaymentsChannelScene');
const changeReferralRewardScene = require('./changeReferralRewardScene');

// Asosiy menyu tugmalaridan foydalanishdan oldin majburiy obunani qayta tekshirish
// (masalan, admin yangi majburiy kanal qo'shgan bo'lsa)
async function requireSubscription(ctx, next) {
  if (isAdmin(ctx.from.id)) return next();

  const { subscribed, missing } = await checkAllSubscriptions(ctx);
  if (!subscribed) {
    return ctx.reply(
      `📢 Botdan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling:\n\nObuna bo'lgach, "✅ Obuna bo'ldim" tugmasini bosing.`,
      subscribeKeyboard(missing)
    );
  }
  return next();
}

function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  const stage = new Scenes.Stage([
    withdrawScene, addChannelScene, broadcastScene,
    banScene, unbanScene,
    addDiamondsScene, removeDiamondsScene,
    changeMinWithdrawScene, changePaymentsChannelScene, changeReferralRewardScene,
  ]);
  bot.use(session());
  bot.use(stage.middleware());

  // Bloklangan foydalanuvchilarni to'xtatish
  bot.use(async (ctx, next) => {
    if (!ctx.from || isAdmin(ctx.from.id)) return next();
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (user && user.isBlocked) {
      if (ctx.callbackQuery) {
        return ctx.answerCbQuery('🚫 Siz botdan foydalanishdan bloklangansiz.', { show_alert: true });
      }
      return ctx.reply('🚫 Siz botdan foydalanishdan bloklangansiz.');
    }
    return next();
  });

  // Foydalanuvchi botni bloklab/o'chirib tashlashini yoki qayta ochishini kuzatish
  bot.on('my_chat_member', async (ctx) => {
    try {
      const update = ctx.myChatMember;
      if (!update || ctx.chat.type !== 'private') return;

      const status = update.new_chat_member.status;
      if (status === 'kicked' || status === 'left') {
        await applyLeavePenalty(update.chat.id, ctx.telegram);
      } else if (status === 'member') {
        await clearBotBlockedFlag(update.chat.id);
      }
    } catch (err) {
      console.error('my_chat_member xatosi:', err);
    }
  });

  // /start
  bot.start(startHandler);
  bot.action('check_subscription', checkSubscriptionHandler);
  bot.on('contact', phoneContactHandler);

  // Asosiy menyu (har bir tugma bosilganda majburiy obuna qayta tekshiriladi)
  bot.hears('💎 Almaz ishlash', requireSubscription, earnHandler);
  bot.hears('💰 Hisobim', requireSubscription, balanceHandler);
  bot.hears('📚 Qo\'llanma', requireSubscription, guideHandler);
  bot.hears('📣 To\'lovlar kanali', requireSubscription, paymentsChannelHandler);
  bot.hears('📧 Murojaat', requireSubscription, supportHandler);
  bot.hears('🏦 Almazni yechish', requireSubscription, (ctx) => ctx.scene.enter('withdrawScene'));
  bot.hears('◀️ Orqaga', requireSubscription, (ctx) => ctx.reply('Asosiy menyu 👇', mainMenu(isAdmin(ctx.from.id))));

  // "⚙️ Admin panel" tugmasi asosiy menyudan
  bot.hears('⚙️ Admin panel', adminPanelHandler);

  // Admin inline panel
  bot.command('admin', adminPanelHandler);
  bot.action('admin_back', adminBackAction);
  bot.action('admin_stats', adminStatsAction);
  bot.action('admin_channels', adminChannelsAction);
  bot.action('admin_channel_add', adminChannelAddAction);
  bot.action(/^admin_channel_del_(.+)$/, adminChannelDeleteAction);
  bot.action('admin_pending', adminPendingAction);
  bot.action(/^admin_approve_(.+)$/, adminApproveAction);
  bot.action(/^admin_reject_(.+)$/, adminRejectAction);
  bot.action('admin_ban', adminBanAction);
  bot.action('admin_unban', adminUnbanAction);
  bot.action('admin_add_diamonds', adminAddDiamondsAction);
  bot.action('admin_remove_diamonds', adminRemoveDiamondsAction);
  bot.action('admin_min_withdraw', adminMinWithdrawAction);
  bot.action('admin_payments_channel', adminPaymentsChannelAction);
  bot.action('admin_referral_reward', adminReferralRewardAction);
  bot.action('admin_broadcast', adminBroadcastAction);
  bot.action('admin_users', adminUsersAction);

  // Eski matnli buyruqlar
  bot.command('pending', pendingHandler);
  bot.command('broadcast', broadcastHandler);
  bot.hears(/^\/approve_/, approveHandler);
  bot.hears(/^\/reject_/, rejectHandler);

  bot.catch((err, ctx) => {
    console.error(`Bot xatosi (${ctx.updateType}):`, err);
  });

  return bot;
}

module.exports = createBot;
