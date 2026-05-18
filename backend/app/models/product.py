from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    contact = Column(String(200))
    country = Column(String(100))
    lead_time_days = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="supplier")
    orders = relationship("Order", back_populates="supplier")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(300), nullable=False)
    description = Column(Text)
    category = Column(String(150))
    unit = Column(String(30), default="UN")
    unit_cost = Column(Float, default=0.0)
    min_stock = Column(Float, default=0.0)
    max_stock = Column(Float, nullable=True)
    reorder_point = Column(Float, default=0.0)
    safety_stock = Column(Float, default=0.0)
    lead_time_days = Column(Integer, default=0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="products")
    demand_history = relationship("DemandHistory", back_populates="product", cascade="all, delete-orphan")
    inventory_levels = relationship("InventoryLevel", back_populates="product", cascade="all, delete-orphan")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="product", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="product", cascade="all, delete-orphan")
