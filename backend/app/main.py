from fastapi import FastAPI

from app.api.routes.health import router as health_router

app = FastAPI(
    title="MoneyKeeper API",
    description="Backend API for the MoneyKeeper finance platform.",
    version="0.1.0",
)

app.include_router(health_router)
