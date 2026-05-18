from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models.inventory import InventoryLevel, InventoryTransaction
from app.models.demand import DemandHistory
from app.schemas.inventory import (
    InventoryLevelIn, InventoryLevelOut,
    TransactionIn, TransactionOut,
    DemandIn, DemandOut,
)
from app.deps import get_current_user

router = APIRouter()


# ── Inventory Levels ───────────────────────────────────────────────────────────

@router.get("/levels", response_model=List[InventoryLevelOut])
def list_levels(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(InventoryLevel)
    if product_id:
        q = q.filter(InventoryLevel.product_id == product_id)
    return q.order_by(InventoryLevel.date.desc()).limit(500).all()


@router.post("/levels", response_model=InventoryLevelOut, status_code=201)
def upsert_level(data: InventoryLevelIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    existing = db.query(InventoryLevel).filter(
        InventoryLevel.product_id == data.product_id,
        InventoryLevel.date == data.date,
    ).first()
    if existing:
        existing.quantity_on_hand = data.quantity_on_hand
        existing.quantity_reserved = data.quantity_reserved
        existing.quantity_available = max(0.0, data.quantity_on_hand - data.quantity_reserved)
        db.commit()
        db.refresh(existing)
        return existing
    level = InventoryLevel(
        **data.model_dump(),
        quantity_available=max(0.0, data.quantity_on_hand - data.quantity_reserved),
    )
    db.add(level)
    db.commit()
    db.refresh(level)
    return level


# ── Transactions ───────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=List[TransactionOut])
def list_transactions(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(InventoryTransaction)
    if product_id:
        q = q.filter(InventoryTransaction.product_id == product_id)
    return q.order_by(InventoryTransaction.date.desc()).limit(500).all()


@router.post("/transactions", response_model=TransactionOut, status_code=201)
def create_transaction(data: TransactionIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = InventoryTransaction(**data.model_dump(), created_by=user.id)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


# ── Demand History ─────────────────────────────────────────────────────────────

@router.get("/demand", response_model=List[DemandOut])
def list_demand(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(DemandHistory)
    if product_id:
        q = q.filter(DemandHistory.product_id == product_id)
    return q.order_by(DemandHistory.date.desc()).limit(1000).all()


@router.post("/demand", response_model=DemandOut, status_code=201)
def create_demand(data: DemandIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    d = DemandHistory(**data.model_dump(), created_by=user.id)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/demand/{demand_id}", status_code=204)
def delete_demand(demand_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    d = db.query(DemandHistory).filter(DemandHistory.id == demand_id).first()
    if not d:
        raise HTTPException(404, "Registro não encontrado")
    db.delete(d)
    db.commit()
