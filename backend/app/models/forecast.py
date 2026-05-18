from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    model = Column(String(50), nullable=False)  # MA / ES / HW / LR
    forecast_date = Column(Date, nullable=False, index=True)
    predicted_qty = Column(Float, nullable=False)
    actual_qty = Column(Float, nullable=True)
    mape = Column(Float, nullable=True)
    params = Column(String(500), nullable=True)  # JSON string with model params
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="forecasts")
