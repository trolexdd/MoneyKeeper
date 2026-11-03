# Telegram Mini App

## Что уже реализовано

- Frontend подключает официальный `telegram-web-app.js`, вызывает `ready()` и `expand()`, использует тёмную оболочку и учитывает safe area.
- При запуске внутри Telegram frontend отправляет на backend только сырую строку `Telegram.WebApp.initData`.
- Backend проверяет HMAC-SHA-256 подпись с помощью `TELEGRAM_BOT_TOKEN` и отклоняет устаревшие данные.
- Уже привязанный Telegram ID получает обычную MoneyKeeper access/refresh session.
- Для первого входа пользователь подтверждает существующий аккаунт MoneyKeeper по email и паролю. Данные остаются в том же профиле; новый финансовый профиль не создаётся.
- Один Telegram ID может быть связан только с одним MoneyKeeper аккаунтом.

## Настройка бота

1. Создать бота через официальный `@BotFather` и сохранить выданный token как секрет.
2. На backend добавить в локальный `.env` или secret manager:
   ```dotenv
   TELEGRAM_BOT_TOKEN=<secret-token-from-botfather>
   TELEGRAM_INIT_DATA_MAX_AGE_SECONDS=3600
   ```
3. Не добавлять token в frontend-переменные, Git, логи или сообщения.
4. Развернуть frontend на публичном HTTPS URL, например `https://app.example.com`.
5. Развернуть backend на публичном HTTPS URL, например `https://api.example.com`.
6. При сборке frontend задать `VITE_API_URL=https://api.example.com`.
7. В backend `CORS_ORIGINS` разрешить точный frontend origin, например `https://app.example.com`.
8. В `@BotFather` открыть настройки бота и включить Main Mini App с frontend HTTPS URL. Альтернативно настроить Menu Button и задать URL приложения.

## Первый запуск пользователем

1. Открыть бота в Telegram и запустить Mini App через кнопку приложения.
2. Если Telegram ещё не привязан к MoneyKeeper, появится экран привязки.
3. Ввести email и пароль существующего MoneyKeeper аккаунта.
4. Backend проверит Telegram initData и пароль, запишет уникальный Telegram ID и выдаст сессию.
5. Следующие запуски Mini App будут входить в тот же аккаунт без повторного ввода пароля.

Обычный вход MoneyKeeper по email в браузере остаётся доступен.

## Локальная разработка

Обычный Vite URL `http://localhost:5173` подходит для проверки web-версии, но сам по себе не является production Telegram Mini App URL. Для полноценного теста внутри Telegram нужен доступный Telegram клиенту HTTPS URL и корректно настроенный BotFather URL.

До публикации проверьте:
- `alembic upgrade head` — применена миграция `0005_add_telegram_identity`;
- `pytest` и `ruff check .` в backend;
- `npm run build` во frontend;
- привязку существующего аккаунта и повторный вход с тем же Telegram ID;
- отказ при подменённой подписи и просроченном initData.
