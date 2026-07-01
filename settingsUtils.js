const Settings = require('./Settings');

// .env dagi qiymatlar faqat birinchi marta (Settings hali DB da yo'q bo'lsa) standart sifatida ishlatiladi
const DEFAULTS = {
  paymentsChannel: (process.env.PAYMENTS_CHANNEL || process.env.REQUIRED_CHANNEL || 'your_channel').replace('@', ''),
  referralReward: Number(process.env.REFERRAL_REWARD || 250),
  minWithdraw: Number(process.env.MIN_WITHDRAW || 1000),
};

let cache = null;

async function getSettings() {
  if (cache) return cache;

  let settings = await Settings.findOne({ key: 'main' });
  if (!settings) {
    settings = await Settings.create({ key: 'main', ...DEFAULTS });
  }

  cache = settings;
  return settings;
}

async function updateSetting(field, value) {
  const settings = await getSettings();
  settings[field] = value;
  await settings.save();
  cache = settings;
  return settings;
}

module.exports = { getSettings, updateSetting };
