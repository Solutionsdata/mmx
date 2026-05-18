from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models.demand import DemandHistory
from app.models.forecast import Forecast
from app.models.inventory import InventoryLevel, InventoryTransaction
from app.models.order import Order
from app.models.product import Product
from app.services.kpi_calculator import (
    calc_mape, calc_service_level, calc_inventory_turnover,
    calc_lead_time, calc_sla, calc_stockout_rate, calc_zero_stock_rate,
)
from app.deps import get_current_user
from datetime import date

router = APIRouter()


@router.get("/summary")
def kpi_summary(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # ── MAPE: compare saved forecasts with actual demand ──────────────────────
    fc_q = db.query(Forecast).filter(Forecast.actual_qty.isnot(None))
    if product_id:
        fc_q = fc_q.filter(Forecast.product_id == product_id)
    forecasts = fc_q.all()
    mape = calc_mape(
        [f.actual_qty for f in forecasts],
        [f.predicted_qty for f in forecasts],
    ) if forecasts else None

    # ── Service Level: orders fulfilled on time ────────────────────────────────
    ord_q = db.query(Order).filter(Order.status.in_(["RECEIVED", "PARTIAL"]))
    if product_id:
        ord_q = ord_q.filter(Order.product_id == product_id)
    orders = ord_q.all()
    total_orders = len(orders)
    on_time = sum(1 for o in orders if o.actual_date and o.expected_date and o.actual_date <= o.expected_date)
    service_level = calc_service_level(total_orders, on_time)

    # ── Inventory Turnover (last 12 months) ────────────────────────────────────
    tx_q = db.query(InventoryTransaction).filter(InventoryTransaction.transaction_type == "OUT")
    if product_id:
        tx_q = tx_q.filter(InventoryTransaction.product_id == product_id)
    out_txs = tx_q.all()

    # join with product to get unit cost
    total_cogs = 0.0
    for tx in out_txs:
        p = db.query(Product).filter(Product.id == tx.product_id).first()
        if p:
            total_cogs += tx.quantity * p.unit_cost

    lvl_q = db.query(func.avg(InventoryLevel.quantity_on_hand).label("avg_qty"),
                     InventoryLevel.product_id)
    if product_id:
        lvl_q = lvl_q.filter(InventoryLevel.product_id == product_id)
    lvl_q = lvl_q.group_by(InventoryLevel.product_id)
    avg_levels = lvl_q.all()
    avg_inventory_value = 0.0
    for row in avg_levels:
        p = db.query(Product).filter(Product.id == row.product_id).first()
        if p:
            avg_inventory_value += (row.avg_qty or 0) * p.unit_cost

    turnover = calc_inventory_turnover(total_cogs, avg_inventory_value)

    # ── Lead Time ─────────────────────────────────────────────────────────────
    lt_orders = [o for o in orders if o.actual_date and o.order_date]
    lead_time = calc_lead_time(
        [o.order_date for o in lt_orders],
        [o.actual_date for o in lt_orders],
    )

    # ── SLA ───────────────────────────────────────────────────────────────────
    sla_orders = [o for o in orders if o.sla_met is not None]
    sla = calc_sla([o.sla_met for o in sla_orders])

    # ── Stockout & Zero-Stock (from inventory transactions) ───────────────────
    so_q = db.query(InventoryTransaction).filter(InventoryTransaction.transaction_type == "STOCKOUT")
    if product_id:
        so_q = so_q.filter(InventoryTransaction.product_id == product_id)
    stockout_count = so_q.count()

    # total distinct periods (months) with any inventory level
    all_levels_q = db.query(InventoryLevel)
    if product_id:
        all_levels_q = all_levels_q.filter(InventoryLevel.product_id == product_id)
    all_levels = all_levels_q.all()
    total_periods = len(all_levels)
    zero_periods = sum(1 for lv in all_levels if lv.quantity_on_hand <= 0)

    stockout_rate = calc_stockout_rate(stockout_count, total_periods)
    zero_stock_rate = calc_zero_stock_rate(zero_periods, total_periods)

    # ── Product count ─────────────────────────────────────────────────────────
    product_count = db.query(Product).count()
    active_orders = db.query(Order).filter(Order.status.in_(["PENDING", "IN_TRANSIT"])).count()

    return {
        "mape": round(mape, 2) if mape else None,
        "service_level": service_level,
        "inventory_turnover": turnover,
        "lead_time_days": lead_time,
        "sla": sla,
        "stockout_rate": stockout_rate,
        "zero_stock_rate": zero_stock_rate,
        "product_count": product_count,
        "active_orders": active_orders,
        "total_orders_analyzed": total_orders,
    }


@router.get("/inventory-status")
def inventory_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Returns current stock status per product."""
    products = db.query(Product).all()
    result = []
    for p in products:
        latest = (
            db.query(InventoryLevel)
            .filter(InventoryLevel.product_id == p.id)
            .order_by(InventoryLevel.date.desc())
            .first()
        )
        qty = latest.quantity_on_hand if latest else 0.0
        status = "OK"
        if qty <= 0:
            status = "ZERO"
        elif qty <= p.safety_stock:
            status = "CRITICAL"
        elif qty <= p.reorder_point:
            status = "LOW"
        result.append({
            "product_id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "quantity_on_hand": qty,
            "safety_stock": p.safety_stock,
            "reorder_point": p.reorder_point,
            "min_stock": p.min_stock,
            "unit": p.unit,
            "unit_cost": p.unit_cost,
            "status": status,
            "last_date": str(latest.date) if latest else None,
        })
    return result
