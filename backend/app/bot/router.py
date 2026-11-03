from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

from app.bot.keyboards import build_mini_app_keyboard


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

    @router.message(Command("help"))
    async def help_handler(message: Message) -> None:
        await message.answer(
            "MoneyKeeper — помощник для управления личными финансами.\n\n"
            "/start — приветствие и запуск приложения\n"
            "/app — открыть Mini App\n"
            "/help — список команд"
        )

    return router
