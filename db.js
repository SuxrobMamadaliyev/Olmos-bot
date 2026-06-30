const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI .env faylida topilmadi');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);
  console.log('✅ MongoDB ga ulanildi');

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB xatosi:', err.message);
  });
}

module.exports = connectDB;
