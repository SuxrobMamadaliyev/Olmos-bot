const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter(Boolean);

function isAdmin(telegramId) {
  return ADMIN_IDS.includes(telegramId);
}

module.exports = { isAdmin, ADMIN_IDS };
