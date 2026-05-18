from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class InventoryLevelIn(BaseModel):
    product_id: int
    date: date
    quantity_on_hand: float
    quantity_reserved: float = 0.0


class InventoryLevelOut(BaseModel):
    id: int
    product_id: int
    date: date
    quantity_on_hand: float
    quantity_reserved: float
    quantity_available: float
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionIn(BaseModel):
    product_id: int
    transaction_type: str
    quantity: float
    reference: Optional[str] = None
    date: date
    notes: Optional[str] = None


class TransactionOut(TransactionIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DemandIn(BaseModel):
    product_id: int
    date: date
    quantity: float
    source: str = "manual"


class DemandOut(DemandIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
