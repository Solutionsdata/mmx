from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.config import settings
from app.routers import auth, admin, products, inventory, forecast, orders, kpis, imports
import app.models  # noqa — register all ORM models
import asyncio
import logging

logger = logging.getLogger(__name__)
_db_ready = False
_db_error: str = ""


def _init_db_sync():
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS mmx"))
        conn.commit()
    Base.metadata.create_all(bind=engine, checkfirst=True)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE mmx.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE mmx.users ADD COLUMN IF NOT EXISTS assinatura_ate TIMESTAMP"))
        conn.commit()
    if settings.ADMIN_EMAIL:
        import bcrypt
        from app.models.user import User
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
            if u:
                if not u.is_active or not u.is_admin:
                    u.is_active = True
                    u.is_admin = True
                    db.commit()
            else:
                hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
                u = User(
                    nome="Admin MMX",
                    email=settings.ADMIN_EMAIL,
                    hashed_password=hashed,
                    is_active=True,
                    is_admin=True,
                )
                db.add(u)
                db.commit()
                logger.info("Admin user created: %s", settings.ADMIN_EMAIL)
        finally:
            db.close()


async def _init_db():
    global _db_ready, _db_error
    for attempt in range(20):
        try:
            await asyncio.to_thread(_init_db_sync)
            _db_ready = True
            _db_error = ""
            logger.info("Database initialized successfully")
            return
        except Exception as exc:
            _db_error = f"Attempt {attempt + 1}/20: {type(exc).__name__}: {exc}"
            logger.warning("DB init attempt %d/20 failed: %s", attempt + 1, exc)
            await asyncio.sleep(3)
    logger.error("Database initialization failed after 20 attempts: %s", _db_error)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_init_db())
    yield


app = FastAPI(
    title="MMX – Managing the Supply Chain",
    description="API para planejamento de demanda, gestão de estoques e KPIs de supply chain",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

_origins = list({
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    settings.FRONTEND_URL,
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administração"])
app.include_router(products.router, prefix="/api/products", tags=["Produtos"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Estoque"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Previsão"])
app.include_router(orders.router, prefix="/api/orders", tags=["Pedidos"])
app.include_router(kpis.router, prefix="/api/kpis", tags=["KPIs"])
app.include_router(imports.router, prefix="/api/import", tags=["Importação"])


@app.get("/api/health", tags=["Sistema"])
def health_check():
    return {"status": "ok", "version": "1.0.0", "db_ready": _db_ready}


@app.get("/api/health/db", tags=["Sistema"])
def health_db():
    if _db_ready:
        return {"status": "ok"}
    return JSONResponse(
        status_code=503,
        content={"status": "initializing", "error": _db_error},
    )
