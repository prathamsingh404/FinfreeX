import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.config import get_settings
from app.routers import market, screener, portfolio, watchlist, alerts, ai, news, options, charts, notifications
from app.services.alert_service import start_alert_checker

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background price alerts scheduler
    logging.info("Starting background alert checking task...")
    alert_task = asyncio.create_task(start_alert_checker())
    yield
    logging.info("Shutting down background tasks...")
    alert_task.cancel()
    try:
        await alert_task
    except asyncio.CancelledError:
        logging.info("Alert checker stopped.")

app = FastAPI(
    title="PortAI API",
    version="2.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
    lifespan=lifespan
)

# CORS configuration
origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(charts.router, prefix="/api/charts", tags=["Candle Charts"])
app.include_router(screener.router, prefix="/api/screener", tags=["Stock Screener"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Paper Portfolio"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["User Watchlists"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Price Alerts"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Advisor"])
app.include_router(news.router, prefix="/api/news", tags=["Business News"])
app.include_router(options.router, prefix="/api/options", tags=["Options Chain"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Telegram Settings"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
