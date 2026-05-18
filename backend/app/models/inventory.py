from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class InventoryLevel(Base):
    __tablename__ = "inventory_levels"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    quantity_on_hand = Column(Float, default=0.0)
    quantity_reserved = Column(Float, default=0.0)
    quantity_available = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="inventory_levels")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = Column(String(20), nullable=False)  # IN / OUT / ADJUSTMENT / STOCKOUT / RETURN
    quantity = Column(Float, nullable=False)
    reference = Column(String(200))
    date = Column(Date, nullable=False, index=True)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="inventory_transactions")
