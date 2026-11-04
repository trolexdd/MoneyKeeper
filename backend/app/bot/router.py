from datetime import UTC, datetime
from uuid import UUID

from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message
from sqlalchemy.exc import SQLAlchemyError

from app.bot.finance import (
    find_linked_user_id,
    format_money,
    get_balance_totals,
    get_monthly_totals,
    get_recent_transactions,
)
from app.bot.keyboards import build_mini_app_keyboard
from app.db.session import SessionLocal

MONTH_NAMES = (
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
)


async def _require_linked_user_id(message: Message) -> UUID | None:
    if message.from_user is None:
        return None

    try:
        with SessionLocal() as db:
            user_id = find_linked_user_id(db, message.from_user.id)
    except SQLAlchemyError:
        await message.answer(
            "Не удалось получить доступ к финансовым данным. Попробуйте немного позже."
        )
        return None

    if user_id is None:
        await message.answer(
            "Сначала привяжите Telegram к существующему аккаунту MoneyKeeper "
            "через Mini App. Не отправляйте пароль в чат с ботом."
        )
    return user_id


def _signed_money(amount: object, sign: str) -> str:
    return f"{sign}{format_money(amount)}"


def create_router(mini_app_url: str | None) -> Router:
    router = Router(name="moneykeeper-bot")

    @router.message(CommandStart())
    async def start_handler(message: Message) -> None:
        if mini_app_url:
            await message.answer(
                "Добро пожаловать в MoneyKeeper! 👋\n\n"
                "Управляйте доходами, расходами и бюджетами в одном месте.",
                reply_markup=build_mini_app_keyboard(mini_app_url),
            )
            return

        await message.answer(
            "Добро пожаловать в MoneyKeeper! 👋\n\n"
            "Бот подключён, но Mini App пока не опубликовано. "
            "Когда HTTPS-адрес приложения будет настроен, здесь появится кнопка запуска."
        )

    @router.message(Command("app"))
    async def app_handler(message: Message) -> None:
        if not mini_app_url:
            await message.answer(
                "Mini App пока не опубликовано. "
                "Кнопка запуска появится после настройки HTTPS-адреса."
            )
            return

        await message.answer(
            "Открывайте MoneyKeeper:",
            reply_markup=build_mini_app_keyboard(mini_app_url),
        )

    @router.message(Command("balance"))
    async def balance_handler(message: Message) -> None:
        user_id = await _require_linked_user_id(message)
        if user_id is None:
            return

        try:
            with SessionLocal() as db:
                totals = get_balance_totals(db, user_id)
        except SQLAlchemyError:
            await message.answer(
                "Не удалось загрузить баланс. Попробуйте немного позже."
            )
            return

        await message.answer(
            "💰 Баланс за всё время\n\n"
            f"Доходы: {_signed_money(totals.total_income, '+')}\n"
            f"Расходы: {_signed_money(totals.total_expenses, '−')}\n"
            f"Итого: {format_money(totals.balance)}"
        )

    @router.message(Command("stats"))
    async def stats_handler(message: Message) -> None:
        user_id = await _require_linked_user_id(message)
        if user_id is None:
            return

        now = datetime.now(UTC)
        try:
            with SessionLocal() as db:
                totals = get_monthly_totals(db, user_id, now)
        except SQLAlchemyError:
            await message.answer(
                "Не удалось загрузить статистику. Попробуйте немного позже."
            )
            return

        net = totals.income - totals.expenses
        lines = [
            f"📊 Статистика за {MONTH_NAMES[now.month - 1]} {now.year} (UTC)",
            "",
            f"Доходы: {_signed_money(totals.income, '+')}",
            f"Расходы: {_signed_money(totals.expenses, '−')}",
            f"Разница: {format_money(net)}",
        ]
        if totals.top_categories:
            lines.extend(["", "Топ категорий расходов:"])
            lines.extend(
                f"• {category}: {format_money(amount)}"
                for category, amount in totals.top_categories
            )

        await message.answer("\n".join(lines))

    @router.message(Command("recent"))
    async def recent_handler(message: Message) -> None:
        user_id = await _require_linked_user_id(message)
        if user_id is None:
            return

        try:
            with SessionLocal() as db:
                transactions = get_recent_transactions(db, user_id, limit=5)
        except SQLAlchemyError:
            await message.answer(
                "Не удалось загрузить операции. Попробуйте немного позже."
            )
            return

        if not transactions:
            await message.answer("🧾 Пока нет операций в MoneyKeeper.")
            return

        lines = ["🧾 Последние операции"]
        for transaction in transactions:
            occurred_at = transaction.occurred_at
            if occurred_at.tzinfo is None:
                occurred_at = occurred_at.replace(tzinfo=UTC)
            date_label = occurred_at.astimezone(UTC).strftime("%d.%m %H:%M UTC")
            description = " ".join(transaction.description.split())[:70]
            sign = "+" if transaction.type == "income" else "−"
            lines.append(
                f"\n{date_label}\n{description}\n"
                f"{transaction.category} · {sign}{format_money(transaction.amount)}"
            )

        await message.answer("\n".join(lines))

    @router.message(Command("help"))
    async def help_handler(message: Message) -> None:
        await message.answer(
            "MoneyKeeper — помощник для управления личными финансами.\n\n"
            "/balance — общий баланс за всё время\n"
            "/stats — доходы и расходы за текущий месяц\n"
            "/recent — последние 5 операций\n"
            "/app — открыть Mini App\n"
            "/help — список команд"
        )

    return router
