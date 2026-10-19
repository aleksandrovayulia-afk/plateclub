# PLATE CLUB на Firebase

Хостинг (страницы) + Cloud Function `api` (сервер игры) + база Postgres на Neon (бесплатно).

Один раз:
1. neon.tech → создать проект → скопировать строку подключения `postgres://...` (Connection string).
2. На компьютере: установить Node.js 20+ (nodejs.org), затем в Терминале:
   npm install -g firebase-tools
   git clone https://github.com/aleksandrovayulia-afk/plateclub.git && cd plateclub
   firebase login
3. Секреты (вставить свои значения, когда спросит):
   firebase functions:secrets:set DATABASE_URL
   firebase functions:secrets:set PLATE_SEAL_SECRET
   firebase functions:secrets:set ADMIN_SETUP_CODE
4. Таблицы в базе:
   cd functions && npm install && cd ..
   DATABASE_URL="строка-из-neon" node functions/migrate.js
5. Публикация:
   firebase deploy

Обновление после изменений: git pull, затем шаги 4 и 5.
