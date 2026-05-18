from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.config import settings
from app.routers import auth, admin, products, inventory, forecast, orders, kpis, imports
import app.models  # noqa — ensure all models are registered
import time
import logging

logger = logging.getLogger(__name__)

# Retry DB startup to handle cold starts (Neon/Render)
for attempt in range(5):
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_ate TIMESTAMP"))
            conn.commit()
        break
    except Exception as e:
        logger.warning(f"DB startup attempt {attempt + 1}/5 failed: {e}")
        if attempt < 4:
            time.sleep(3)
        else:
            raise

# Ensure ADMIN_EMAIL user is always active and admin
if settings.ADMIN_EMAIL:
    try:
        from app.models.user import User
        db: Session = SessionLocal()
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if admin_user and (not admin_user.is_active or not admin_user.is_admin):
            admin_user.is_active = True
            admin_user.is_admin = True
            db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"Admin promotion check failed: {e}")

app = FastAPI(
    title="MMX – Managing the Supply Chain",
    description="API para planejamento de demanda, gestão de estoques e KPIs de supply chain",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
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
    return {"status": "ok", "version": "1.0.0"}
