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
const { mainMenu } = require('./keyboards');

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

  // /start
  bot.start(startHandler);
  bot.action('check_subscription', checkSubscriptionHandler);
  bot.on('contact', phoneContactHandler);

  // Asosiy menyu
  bot.hears('💎 Almaz ishlash', earnHandler);
  bot.hears('💰 Hisobim', balanceHandler);
  bot.hears('📚 Qo\'llanma', guideHandler);
  bot.hears('📣 To\'lovlar kanali', paymentsChannelHandler);
  bot.hears('📧 Murojaat', supportHandler);
  bot.hears('🏦 Almazni yechish', (ctx) => ctx.scene.enter('withdrawScene'));
  bot.hears('◀️ Orqaga', (ctx) => ctx.reply('Asosiy menyu 👇', mainMenu(isAdmin(ctx.from.id))));

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
