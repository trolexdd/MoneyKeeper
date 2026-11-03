import asyncio

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.types import BotCommand, MenuButtonCommands, MenuButtonWebApp, WebAppInfo

from app.bot.keyboards import normalize_mini_app_url
from app.bot.router import create_router
from app.core.config import get_settings


async def configure_bot(bot: Bot, mini_app_url: str | None) -> None:
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Открыть MoneyKeeper"),
            BotCommand(command="app", description="Запустить приложение"),
            BotCommand(command="help", description="Помощь и список команд"),
        ]
    )

    if mini_app_url:
        menu_button = MenuButtonWebApp(
            text="MoneyKeeper",
            web_app=WebAppInfo(url=mini_app_url),
        )
    else:
        menu_button = MenuButtonCommands()

    await bot.set_chat_menu_button(menu_button=menu_button)


async def main() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("Set TELEGRAM_BOT_TOKEN in the repository-root .env file")

    mini_app_url = normalize_mini_app_url(settings.telegram_mini_app_url)
    proxy_url = settings.telegram_proxy_url.strip() or None
    session = AiohttpSession(proxy=proxy_url)
    bot = Bot(token=settings.telegram_bot_token, session=session)
    dispatcher = Dispatcher()
    dispatcher.include_router(create_router(mini_app_url))

    try:
        await configure_bot(bot, mini_app_url)
        await dispatcher.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
