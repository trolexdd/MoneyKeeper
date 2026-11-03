# Roadmap

## Phase 0 — Foundation
- [x] Создать репозиторий MoneyKeeper.
- [x] Добавить стартовую продуктовую и техническую документацию.
- [ ] Согласовать стек, роли участников и правила работы с main.
- [x] Зафиксировать визуальное направление и базовые UI-токены в `docs/DESIGN_SYSTEM.md`.

## Phase 1 — Backend foundation
- [ ] FastAPI scaffold и конфигурация окружения.
- [ ] PostgreSQL, SQLAlchemy 2 и Alembic.
- [ ] Health check, structured logging и обработка ошибок.
- [ ] CI: lint, type checks и tests.
- [ ] Auth, сессии и базовая модель workspace.

## Phase 2 — Core finance
- [ ] Счета и роли участников.
- [ ] Доходы, расходы и переводы.
- [ ] Категории и история операций.
- [ ] Валютная корректность и сверка балансов.

## Phase 3 — Planning and analytics
- [x] Бюджеты и лимиты: месячные лимиты по категориям, CRUD, расчёт расходов, прогресс и предупреждения.
- [ ] Запланированные и повторяющиеся операции.
- [ ] Вклады и расчёт доходности.
- [ ] Аналитика и XLSX экспорт.

## Phase 4 — Telegram
- [ ] Отдельный aiogram bot process.
- [ ] Безопасная привязка Telegram.
- [ ] Команды и быстрый ввод операций.
- [ ] Mini App с проверкой initData.
- [ ] Worker и идемпотентные напоминания.

## Phase 5 — AI and collaboration
- [ ] AI adapter: Gemini и OpenRouter fallback.
- [ ] AI chat, parsing и отчёты с явным подтверждением действий.
- [ ] Совместные счета и проверка ролей.
- [ ] Check-in, streaks и парные challenges.

## Phase 6 — Deployment
- [ ] Docker Compose production profile.
- [ ] VPS, HTTPS и закрытый доступ к PostgreSQL.
- [ ] Backup/restore drill и мониторинг.
- [ ] Security review и release checklist.

Пункты переходят в Done только после тестов и проверки сценариев.
