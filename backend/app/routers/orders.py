from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.order import Order
from app.schemas.order import OrderIn, OrderOut, OrderUpdate
from app.deps import get_current_user
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=List[OrderOut])
def list_orders(
    product_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(Order)
    if product_id:
        q = q.filter(Order.product_id == product_id)
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.order_date.desc()).limit(500).all()


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(data: OrderIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if data.order_number and db.query(Order).filter(Order.order_number == data.order_number).first():
        raise HTTPException(400, "Número de pedido já cadastrado")
    order = Order(**data.model_dump(), created_by=user.id)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}", response_model=OrderOut)
def update_order(order_id: int, data: OrderUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Pedido não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    # Auto-calculate SLA met if actual_date is set
    if order.actual_date and order.expected_date and order.sla_days is not None:
        delta = (order.actual_date - order.order_date).days
        order.sla_met = delta <= order.sla_days
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Pedido não encontrado")
    db.delete(order)
    db.commit()
