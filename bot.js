const { Telegraf, Scenes, session } = require('telegraf');

const { startHandler, checkSubscriptionHandler } = require('./startHandler');
const {
  earnHandler,
  balanceHandler,
  guideHandler,
  paymentsChannelHandler,
  supportHandler,
} = require('./menuHandler');
const {
  adminPanelHandler,
  pendingHandler,
  approveHandler,
  rejectHandler,
  broadcastHandler,
} = require('./adminHandler');
const withdrawScene = require('./withdrawScene');
const { mainMenu } = require('./keyboards');

function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  const stage = new Scenes.Stage([withdrawScene]);
  bot.use(session());
  bot.use(stage.middleware());

  // /start va referal
  bot.start(startHandler);
  bot.action('check_subscription', checkSubscriptionHandler);

  // Asosiy menyu tugmalari
  bot.hears('💎 Ishlash', earnHandler);
  bot.hears('💰 Hisobim', balanceHandler);
  bot.hears('📚 Qo\'llanma', guideHandler);
  bot.hears('📣 To\'lovlar kanali', paymentsChannelHandler);
  bot.hears('📧 Murojaat', supportHandler);
  bot.hears('🏦 Almazni yechish', (ctx) => ctx.scene.enter('withdrawScene'));
  bot.hears('◀️ Orqaga', (ctx) => ctx.reply('Asosiy menyu 👇', mainMenu));

  // Admin buyruqlari
  bot.command('admin', adminPanelHandler);
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
