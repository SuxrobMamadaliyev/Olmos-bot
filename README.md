# Referal bot (Node.js + MongoDB + Render)

Telegram uchun virtual "olmos" balli referal bot. Foydalanuvchilar do'stlarini taklif qiladi,
har bir tasdiqlangan referal uchun ball oladi va ballarni "yechib olish" so'rovini yuboradi
(adminlar tasdiqlaydi/rad etadi).

## ⚠️ Muhim eslatma
Bu bot virtual ball (gamification) tizimi sifatida tuzilgan. Agar siz ballarni real pulga yoki
sovg'aga aylantirmoqchi bo'lsangiz, foydalanuvchilarga shartlarni (necha ball = qancha pul,
qachon to'lanadi) aniq va oldindan ko'rsating, hamda moliyaviy majburiyatlaringizni
to'lay olishingizga ishonch hosil qiling.

## Tuzilma
```
src/
  index.js          # serverni ishga tushirish (webhook/polling)
  bot.js             # barcha handlerlarni ulash
  db.js               # MongoDB ulanish
  keyboards.js        # menyu tugmalari
  models/
    User.js
    Withdraw.js
  handlers/
    start.js          # /start, referal, majburiy obuna
    menu.js            # asosiy menyu bo'limlari
    admin.js            # admin panel
  scenes/
    withdrawScene.js   # yechib olish oqimi
  utils/
    subscription.js     # kanalga obunani tekshirish
```

## O'rnatish (lokal)

1. Bog'liqliklarni o'rnating:
   ```bash
   npm install
   ```
2. `.env.example` ni `.env` ga nusxalang va to'ldiring:
   ```bash
   cp .env.example .env
   ```
   - `BOT_TOKEN` — @BotFather dan oling
   - `MONGO_URI` — MongoDB Atlas (bepul cluster yetarli) ulanish satri
   - `ADMIN_IDS` — sizning Telegram ID raqamingiz (bir nechta bo'lsa vergul bilan)
   - `REQUIRED_CHANNEL` — majburiy obuna kanali username (bot kanalda **admin** bo'lishi shart!)
   - `BOT_USERNAME` — botingiz username
3. Ishga tushiring:
   ```bash
   npm run dev
   ```

## MongoDB Atlas sozlash (qisqacha)
1. https://cloud.mongodb.com da bepul cluster yarating.
2. Database Access'da foydalanuvchi yarating.
3. Network Access'da `0.0.0.0/0` ni qo'shing (Render dan ulanish uchun).
4. "Connect" → "Drivers" dan connection string oling, `<password>` ni almashtiring.

## Render'ga deploy qilish
1. Loyihani GitHub'ga yuklang.
2. Render.com da **New + → Web Service** → repo'ni tanlang (yoki `render.yaml` orqali Blueprint
   sifatida deploy qiling).
3. Environment Variables bo'limida `.env` dagi barcha qiymatlarni qo'shing.
4. Deploy bo'lgach, Render avtomatik `RENDER_EXTERNAL_URL` beradi — bot shu orqali webhook
   o'rnatadi (kod ichida avtomatik).
5. Render Free plan "sleep" bo'lib qolishi mumkin — uni uyg'oq tutish uchun UptimeRobot kabi
   xizmatdan foydalaning yoki pullik planga o'ting.

## Admin buyruqlari (botda, faqat ADMIN_IDS uchun)
- `/admin` — statistika va asosiy ko'rsatkichlar
- `/pending` — kutilayotgan yechib olish so'rovlari
- `/approve_<id>` — so'rovni tasdiqlash
- `/reject_<id>` — so'rovni rad etish (balans foydalanuvchiga qaytariladi)
- `/broadcast <matn>` — barcha foydalanuvchilarga xabar yuborish

## Keyingi qadamlar (tavsiya)
- Agar real pul/sovg'a beradigan bo'lsangiz, to'lov usulini (karta raqami, Click/Payme) so'rash
  qadamini `withdrawScene.js` ga qo'shing.
- Spam/fake referallarning oldini olish uchun IP yoki qurilma darajasidagi tekshiruvlarni
  qo'shishni o'ylab ko'ring (Telegram bot orqali to'liq garantiya yo'q).
- Botni productionda ishlatishdan oldin barcha matnlarni va shartlarni yuristga ko'rsatish
  tavsiya etiladi, ayniqsa pul/sovg'a va'da qilinsa.
