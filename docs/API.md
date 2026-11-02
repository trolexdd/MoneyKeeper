# API — предварительный контракт

Базовый префикс: `/api/v1`. Контракт уточняется вместе с реализацией OpenAPI.

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/telegram/link`
- `DELETE /auth/telegram/link`

## Accounts and ledger
- `GET|POST /accounts`
- `GET|PATCH|DELETE /accounts/{account_id}`
- `GET|POST /accounts/{account_id}/transactions`
- `GET|PATCH|DELETE /transactions/{transaction_id}`
- `POST /transactions/transfers`
- `POST /transactions/{transaction_id}/undo`

## Categories, budgets and planning
- `GET|POST /categories`
- `PATCH|DELETE /categories/{category_id}`
- `GET|POST /budgets`
- `GET|PATCH|DELETE /budgets/{budget_id}`
- `GET|POST /planned-transactions`
- `PATCH|DELETE /planned-transactions/{id}`

## Analytics and exports
- `GET /analytics/summary`
- `GET /analytics/cashflow`
- `GET /analytics/categories`
- `POST /exports/xlsx`

## Collaboration and notifications
- `POST /accounts/{id}/members`
- `PATCH|DELETE /accounts/{id}/members/{user_id}`
- `GET /notifications`
- `PATCH /notifications/{id}`

## AI
- `POST /ai/chat`
- `POST /ai/parse-transaction`
- `POST /ai/reports`

## API conventions
- JSON, UUID identifiers, UTC timestamps (ISO 8601).
- Pagination через cursor или limit/offset.
- Единый формат ошибок с machine-readable code.
- Auth и object-level authorization обязательны.
- Изменяющие финансовые операции поддерживают idempotency key.
- OpenAPI — источник истины для клиента и интеграций.

Это проектный контракт, а не обещание уже существующих endpoints.
