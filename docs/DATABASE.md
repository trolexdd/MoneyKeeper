# Модель данных — первый вариант

Схема логическая. Точные ограничения, индексы, soft-delete и аудит уточняются перед созданием миграций.

## Основные сущности
- **User:** UUID, email (если используется), password_hash, display_name, timezone, is_active, timestamps.
- **AuthSession:** UUID, user_id FK, token_hash, expires_at, revoked_at, created_at.
- **TelegramIdentity:** UUID, user_id FK, unique telegram_user_id, linked_at.
- **Workspace:** UUID, name, created_by_user_id FK, timestamps.
- **WorkspaceMember:** workspace_id FK, user_id FK, role, created_at.
- **Account:** UUID, workspace_id FK, owner_user_id FK, name, account_type, currency_code (ISO 4217), opening_balance NUMERIC, archived_at.
- **AccountMember:** account_id FK, user_id FK, role (owner/editor/viewer), created_at; unique(account_id,user_id).
- **Category:** UUID, workspace_id FK, name, kind (income/expense), icon, archived_at.
- **Transaction:** UUID, account_id FK, created_by_user_id FK, kind, amount NUMERIC > 0, currency_code, category_id, occurred_at, description, transfer_group_id, timestamps, deleted_at.
- **Budget:** UUID, workspace_id FK, category_id FK, amount NUMERIC, currency_code, period, starts_on, ends_on.
- **PlannedTransaction:** UUID, account_id FK, kind, amount NUMERIC, due_at, recurrence_rule, status.
- **Deposit:** UUID, account_id FK, principal NUMERIC, annual_rate NUMERIC, opened_on, matures_on, capitalization_rule, status.
- **Reminder:** UUID, user_id FK, kind, scheduled_at, payload, status, deduplication_key.
- **AuditEvent:** UUID, actor_user_id, workspace_id, action, target_type, target_id, metadata JSONB, created_at.

## Денежная модель
- Денежные суммы — Decimal в приложении и NUMERIC в PostgreSQL.
- Валюта обязательна у каждого счёта и финансовой операции.
- Нельзя складывать суммы разных валют без явного курса и даты конвертации.
- Перевод — две связанные проводки в одной DB-транзакции.
- Баланс вычисляется по проводкам или поддерживаемому агрегату с проверкой консистентности.

## Доступ
Все запросы ограничиваются workspace/account membership. Роли viewer/editor/owner проверяются в application service, а не только в UI. Изменения ролей и административные действия журналируются.

## Индексы и ограничения
Предусмотреть индексы по owner/workspace, account_id + occurred_at, category_id + occurred_at, due_at/status и уникальные ключи Telegram. Сумма должна быть строго положительной; валюты — ISO 4217; повторные запросы защищаются idempotency key.
