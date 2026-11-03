# API — предварительный контракт

Базовый префикс: /api/v1. Реализованные endpoints отражены ниже; остальные разделы — планируемый контракт.

## Auth

Все пути ниже имеют префикс /api/v1.

| Method | Path | Назначение |
|---|---|---|
| POST | /auth/register | Регистрация, создание сессии и выдача токенов |
| POST | /auth/login | Вход по email и паролю |
| POST | /auth/refresh | Ротация refresh token и выдача новой пары токенов |
| POST | /auth/logout | Отзыв сессии по refresh token |
| GET | /auth/me | Профиль текущего пользователя по access token |

Требования:
- Пароль при регистрации: 12–128 символов.
- Email нормализуется к нижнему регистру.
- Access token — JWT HS256, срок жизни задаётся ACCESS_TOKEN_MINUTES (по умолчанию 15 минут).
- Refresh token — случайный непрозрачный секрет; в БД хранится только SHA-256 hash.
- При refresh старый refresh token сразу становится недействительным.
- /auth/me проверяет не только JWT, но и активность сессии в PostgreSQL.
- Для logout передаётся JSON body: {"refresh_token":"..."}.

## Accounts and ledger

- GET|POST /accounts
- GET|PATCH|DELETE /accounts/{account_id}
- GET|POST /accounts/{account_id}/transactions
- GET|PATCH|DELETE /transactions/{transaction_id}
- POST /transactions/transfers
- POST /transactions/{transaction_id}/undo

## Categories, budgets and planning

- GET|POST /categories
- PATCH|DELETE /categories/{category_id}
- GET|POST /budgets
- GET|PATCH|DELETE /budgets/{budget_id}
- GET|POST /planned-transactions
- PATCH|DELETE /planned-transactions/{id}

## Analytics and exports

- GET /analytics/summary
- GET /analytics/cashflow
- GET /analytics/categories
- POST /exports/xlsx

## Collaboration and notifications

- POST /accounts/{id}/members
- PATCH|DELETE /accounts/{id}/members/{user_id}
- GET /notifications
- PATCH /notifications/{id}

## AI

- POST /ai/chat
- POST /ai/parse-transaction
- POST /ai/reports

## API conventions

- JSON, UUID identifiers, UTC timestamps (ISO 8601).
- Pagination через cursor или limit/offset.
- Единый формат ошибок с machine-readable code.
- Auth и object-level authorization обязательны.
- Изменяющие финансовые операции поддерживают idempotency key.
- OpenAPI — источник истины для клиента и интеграций.

Незаполненные разделы — проектный контракт, а не обещание уже существующих endpoints.
