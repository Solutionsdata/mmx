from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SupplierIn(BaseModel):
    name: str
    contact: Optional[str] = None
    country: Optional[str] = None
    lead_time_days: int = 0


class SupplierOut(SupplierIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProductIn(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "UN"
    unit_cost: float = 0.0
    min_stock: float = 0.0
    max_stock: Optional[float] = None
    reorder_point: float = 0.0
    safety_stock: float = 0.0
    lead_time_days: int = 0
    supplier_id: Optional[int] = None


class ProductOut(ProductIn):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None
    reorder_point: Optional[float] = None
    safety_stock: Optional[float] = None
    lead_time_days: Optional[int] = None
    supplier_id: Optional[int] = None
