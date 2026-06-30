const Channel = require('./Channel');

// Bitta kanalga obunani tekshirish
async function checkOne(ctx, username) {
  try {
    const chatId = username.startsWith('-100') ? username : `@${username.replace('@', '')}`;
    const member = await ctx.telegram.getChatMember(chatId, ctx.from.id);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (err) {
    console.error(`Obunani tekshirishda xato (${username}):`, err.message);
    // Bot kanalda admin bo'lmasa yoki xato bo'lsa, ehtiyot bo'lib false qaytaramiz
    return false;
  }
}

// DB dagi barcha majburiy kanallarni olish
async function getRequiredChannels() {
  return Channel.find().sort({ addedAt: 1 });
}

// Foydalanuvchi barcha majburiy kanallarga obuna bo'lganmi tekshirish
// Qaytaradi: { subscribed: boolean, missing: Channel[] }
async function checkAllSubscriptions(ctx) {
  const channels = await getRequiredChannels();
  if (channels.length === 0) {
    return { subscribed: true, missing: [] };
  }

  const missing = [];
  for (const ch of channels) {
    const ok = await checkOne(ctx, ch.username);
    if (!ok) missing.push(ch);
  }

  return { subscribed: missing.length === 0, missing };
}

// Eski nom bilan moslik uchun (bitta kanal tekshirish)
async function isUserSubscribed(ctx, channelUsername) {
  return checkOne(ctx, channelUsername);
}

module.exports = { isUserSubscribed, checkAllSubscriptions, getRequiredChannels };
