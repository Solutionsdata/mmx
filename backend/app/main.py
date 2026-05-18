from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.config import settings
from app.routers import auth, admin, products, inventory, forecast, orders, kpis, imports
import app.models  # noqa — ensure all models are registered

Base.metadata.create_all(bind=engine)

# Lightweight migrations (idempotent ALTER TABLE)
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_ate TIMESTAMP"))
    conn.commit()

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
