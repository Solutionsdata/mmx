from sqlalchemy import Boolean, Column, DateTime, Integer, String
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    empresa = Column(String(200))
    cargo = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    assinatura_ate = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
