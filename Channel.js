const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    // @username yoki -100... ko'rinishidagi chat id (private kanallar uchun)
    username: { type: String, required: true, unique: true, trim: true },
    title: { type: String, default: null },
    addedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Channel', channelSchema);
