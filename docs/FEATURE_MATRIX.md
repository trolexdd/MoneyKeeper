# Матрица функциональности

Статусы: `Planned` — запланировано; `In Progress` — реализуется; `Verified` — поведение подтверждено тестами.

| Область | Функция | Приоритет | Статус |
|---|---|---:|---|
| Auth | Регистрация, вход, выход | P0 | Planned |
| Auth | Восстановление доступа | P0 | Planned |
| Auth | Привязка/отвязка Telegram | P1 | Planned |
| Accounts | CRUD и архивирование счетов | P0 | Planned |
| Accounts | Общие счета и участники | P1 | Planned |
| Ledger | Доходы, расходы, переводы | P0 | Planned |
| Ledger | Редактирование, удаление, undo | P0 | Planned |
| Categories | Категории и иконки | P0 | Planned |
| Budgets | Лимиты и предупреждения | P1 | Planned |
| Planning | Будущие и повторяющиеся операции | P1 | Planned |
| Deposits | Вклады и расчёт доходности | P1 | Planned |
| Analytics | Сводки и динамика | P1 | Planned |
| Exports | XLSX-отчёты | P1 | Planned |
| Telegram | Команды и быстрый ввод операций | P1 | Planned |
| Mini App | Telegram WebApp интерфейс | P1 | Planned |
| AI | Чат, отчёты, разбор текстового ввода | P2 | Planned |
| Notifications | Напоминания и регулярные задачи | P1 | Planned |
| Social | Check-in, streaks, парные challenges | P2 | Planned |
| Admin | Управление пользователями и аудит | P1 | Planned |

## Definition of Done
- Валидация входных данных и авторизация на backend.
- Проверки прав на объект и негативные тесты.
- Миграции и индексы при изменении схемы.
- Логи без секретов и лишних финансовых данных.
- Документация API обновлена.
- Функция проверена автоматическими тестами.
