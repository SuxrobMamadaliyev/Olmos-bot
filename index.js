require('dotenv').config();
const express = require('express');
const connectDB = require('./db');
const createBot = require('./bot');

const PORT = process.env.PORT || 3000;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; // Render avtomatik beradi

async function main() {
  await connectDB();

  const bot = createBot();
  const app = express();
  app.use(express.json());

  // Render "health check" uchun
  app.get('/', (req, res) => res.send('🤖 Bot ishlamoqda'));

  if (RENDER_EXTERNAL_URL) {
    // Productionda webhook orqali ishlaydi (Render doimiy HTTP server talab qiladi)
    const webhookPath = `/webhook/${process.env.BOT_TOKEN}`;
    app.use(bot.webhookCallback(webhookPath));

    app.listen(PORT, async () => {
      await bot.telegram.setWebhook(`${RENDER_EXTERNAL_URL}${webhookPath}`);
      console.log(`✅ Webhook o'rnatildi: ${RENDER_EXTERNAL_URL}${webhookPath}`);
      console.log(`✅ Server ${PORT} portda ishlamoqda`);
    });
  } else {
    // Lokal rivojlantirish uchun polling
    app.listen(PORT, () => console.log(`✅ Health-check server ${PORT} portda`));
    await bot.launch();
    console.log('✅ Bot polling rejimida ishga tushdi (lokal)');
  }

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((err) => {
  console.error('❌ Botni ishga tushirishda xato:', err);
  process.exit(1);
});
