# Telegram Mini App

## Что уже реализовано

- Frontend подключает официальный `telegram-web-app.js`, вызывает `ready()` и `expand()`, использует тёмную оболочку и учитывает safe area.
- При запуске внутри Telegram frontend отправляет на backend только сырую строку `Telegram.WebApp.initData`.
- Backend проверяет HMAC-SHA-256 подпись с помощью `TELEGRAM_BOT_TOKEN` и отклоняет устаревшие данные.
- Уже привязанный Telegram ID получает обычную MoneyKeeper access/refresh session.
- Для первого входа пользователь подтверждает существующий аккаунт MoneyKeeper по email и паролю. Данные остаются в том же профиле; новый финансовый профиль не создаётся.
- Один Telegram ID может быть связан только с одним MoneyKeeper аккаунтом.
- Отдельный процесс aiogram 3 регистрирует команды `/start`, `/app`, `/help` и настраивает menu button через Bot API.

## Настройка бота

1. Создать бота через официальный `@BotFather` и сохранить выданный token как секрет.
2. На backend добавить в локальный `.env` или secret manager:
   ```dotenv
   TELEGRAM_BOT_TOKEN=<secret-token-from-botfather>
   TELEGRAM_INIT_DATA_MAX_AGE_SECONDS=3600
   ```
3. Не добавлять token в frontend-переменные, Git, логи или сообщения.
4. Для production развернуть frontend на публичном HTTPS URL, например `https://app.example.com`.
5. Развернуть backend на публичном HTTPS URL, например `https://api.example.com`.
6. При сборке frontend задать `VITE_API_URL=https://api.example.com`. Если frontend и API публикуются на одном origin через reverse proxy, переменную можно не задавать.
7. В backend `CORS_ORIGINS` разрешить точный frontend origin, например `https://app.example.com`.
8. Указать `TELEGRAM_MINI_APP_URL=https://app.example.com` в backend `.env`. При запуске bot process он сам установит Menu Button через `setChatMenuButton`. Для дополнительной кнопки Mini App в профиле бота можно отдельно включить Main Mini App через `@BotFather`.

## Запуск Telegram-бота

Бот работает отдельным процессом и не встраивается в FastAPI. Установите зависимости командой `python -m pip install -e ".[dev]"`, затем из каталога `backend/` выполните:

```cmd
.venv\\Scripts\\activate.bat
python -m app.bot.main
```

Процесс использует `TELEGRAM_BOT_TOKEN` из корневого `.env`. При пустом `TELEGRAM_MINI_APP_URL` бот регистрирует команды и отвечает на `/start`, `/app` и `/help`, но не показывает неработающую кнопку Mini App. После настройки публичного HTTPS URL добавьте его в `TELEGRAM_MINI_APP_URL` и перезапустите бота. Не запускайте несколько polling-процессов с одним bot token.

## Первый запуск пользователем

1. Открыть бота в Telegram и запустить Mini App через кнопку приложения.
2. Если Telegram ещё не привязан к MoneyKeeper, появится экран привязки.
3. Ввести email и пароль существующего MoneyKeeper аккаунта.
4. Backend проверит Telegram initData и пароль, запишет уникальный Telegram ID и выдаст сессию.
5. Следующие запуски Mini App будут входить в тот же аккаунт без повторного ввода пароля.

Обычный вход MoneyKeeper по email в браузере остаётся доступен.

## Локальная разработка и временный HTTPS-туннель

Для тестирования Mini App с одного компьютера можно публиковать только Vite frontend. Vite проксирует все запросы `/api` на локальный FastAPI backend, поэтому отдельный туннель для backend и настройка CORS для этого локального сценария не нужны.

1. Применить миграции: `alembic upgrade head`.
2. Запустить backend на `127.0.0.1:8000`.
3. Запустить frontend через `npm run dev` на `127.0.0.1:5173`.
4. Убедиться, что frontend использует same-origin API. По умолчанию `VITE_API_URL` не задан, а `frontend/vite.config.ts` проксирует `/api` на `http://127.0.0.1:8000`.
5. Запустить Quick Tunnel к Vite: `cloudflared tunnel --protocol http2 --url http://127.0.0.1:5173`.
6. Проверить HTTPS URL туннеля в обычном браузере и настроить его в `@BotFather` как Main Mini App URL или Menu Button URL.
7. Для Vite разрешены только хосты домена `.trycloudflare.com`; не открывайте dev server через произвольные публичные домены.

Quick Tunnel имеет временный URL и не гарантирует постоянную доступность. При перезапуске туннеля URL меняется, поэтому нужно обновлять URL в BotFather. Не использовать временный dev-туннель как production-хостинг и тестировать только на вымышленных финансовых данных.

До публикации проверьте:
- `alembic upgrade head` — применена миграция `0005_add_telegram_identity`;
- `pytest` и `ruff check .` в backend;
- `npm run build` во frontend;
- привязку существующего аккаунта и повторный вход с тем же Telegram ID;
- отказ при подменённой подписи и просроченном initData.
