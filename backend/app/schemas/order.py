from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class OrderIn(BaseModel):
    product_id: int
    supplier_id: Optional[int] = None
    order_number: Optional[str] = None
    order_date: date
    expected_date: Optional[date] = None
    quantity_ordered: float
    unit_cost: float = 0.0
    sla_days: Optional[int] = None
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    actual_date: Optional[date] = None
    quantity_received: Optional[float] = None
    status: Optional[str] = None
    sla_met: Optional[bool] = None
    notes: Optional[str] = None


class OrderOut(BaseModel):
    id: int
    product_id: int
    supplier_id: Optional[int] = None
    order_number: Optional[str] = None
    order_date: date
    expected_date: Optional[date] = None
    actual_date: Optional[date] = None
    quantity_ordered: float
    quantity_received: float
    unit_cost: float
    status: str
    sla_days: Optional[int] = None
    sla_met: Optional[bool] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
