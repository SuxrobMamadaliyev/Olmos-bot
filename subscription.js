async function isUserSubscribed(ctx, channelUsername) {
  try {
    const member = await ctx.telegram.getChatMember(`@${channelUsername}`, ctx.from.id);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (err) {
    console.error('Obunani tekshirishda xato:', err.message);
    // Agar bot kanalda admin bo'lmasa yoki xato bo'lsa, ehtiyot bo'lib false qaytaramiz
    return false;
  }
}

module.exports = { isUserSubscribed };
