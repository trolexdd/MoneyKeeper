# MoneyKeeper

Платформа для личных и совместных финансов: web-интерфейс, Telegram Bot / Mini App, аналитика и AI-помощник.

> **Статус:** проектирование. Новая независимая реализация. Старые репозитории и их базы данных не изменяются.

## Документация
- [Требования к продукту](docs/PRD.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [Матрица функциональности](docs/FEATURE_MATRIX.md)
- [Модель данных](docs/DATABASE.md)
- [API](docs/API.md)
- [План разработки](docs/ROADMAP.md)
- [Безопасность](docs/SECURITY.md)
- [Правила разработки](CONTRIBUTING.md)

## Предварительный стек
- Backend: Python 3.12+, FastAPI, Pydantic, SQLAlchemy 2, Alembic
- Web / Telegram Mini App: React, TypeScript, Vite
- Telegram Bot: aiogram 3
- Database: PostgreSQL
- Background jobs: отдельный worker
- Infrastructure: Docker Compose, reverse proxy, HTTPS
- Tests: pytest и frontend unit/component tests

## Принципы
1. Сохраняем функциональный охват прежнего FinTrack, но не переносим его технические ошибки.
2. Не подключаем новую версию к старой БД.
3. Денежные значения храним точно: Decimal / NUMERIC, не float.
4. Проверяем права на каждый финансовый объект на backend.
5. Функция считается готовой после тестов, а не после появления endpoint или экрана.
6. Секреты и реальные финансовые данные не коммитим.

## Текущий статус
Ветка `bootstrap/project-foundation` содержит стартовую продуктовую и техническую документацию. Само приложение ещё не реализовано.
