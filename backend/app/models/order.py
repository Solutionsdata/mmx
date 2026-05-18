from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    order_number = Column(String(100), unique=True, index=True)
    order_date = Column(Date, nullable=False, index=True)
    expected_date = Column(Date, nullable=True)
    actual_date = Column(Date, nullable=True)
    quantity_ordered = Column(Float, nullable=False)
    quantity_received = Column(Float, default=0.0)
    unit_cost = Column(Float, default=0.0)
    status = Column(String(30), default="PENDING")  # PENDING / IN_TRANSIT / RECEIVED / PARTIAL / CANCELLED
    sla_days = Column(Integer, nullable=True)
    sla_met = Column(Boolean, nullable=True)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="orders")
    supplier = relationship("Supplier", back_populates="orders")
