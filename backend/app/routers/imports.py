from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import io
from typing import List
from app.database import get_db
from app.models.product import Product
from app.models.demand import DemandHistory
from app.models.inventory import InventoryLevel
from app.deps import get_current_user
from datetime import date

router = APIRouter()

ALLOWED_TYPES = {
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
}


def read_file(file: UploadFile) -> pd.DataFrame:
    content = file.file.read()
    name = file.filename or ""
    if name.endswith(".csv"):
        return pd.read_csv(io.BytesIO(content))
    else:
        return pd.read_excel(io.BytesIO(content))


@router.post("/products")
def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    CSV/Excel columns: sku, name, category, unit, unit_cost, min_stock,
    max_stock, reorder_point, safety_stock, lead_time_days
    """
    try:
        df = read_file(file)
    except Exception:
        raise HTTPException(400, "Erro ao ler arquivo. Verifique o formato.")

    required = {"sku", "name"}
    missing = required - set(df.columns.str.lower())
    if missing:
        raise HTTPException(400, f"Colunas obrigatórias ausentes: {missing}")

    df.columns = df.columns.str.lower().str.strip()
    created = updated = errors = 0

    for _, row in df.iterrows():
        try:
            sku = str(row["sku"]).strip()
            existing = db.query(Product).filter(Product.sku == sku).first()
            fields = {
                "name": str(row.get("name", "")).strip(),
                "category": str(row.get("category", "")) if pd.notna(row.get("category")) else None,
                "unit": str(row.get("unit", "UN")).strip(),
                "unit_cost": float(row.get("unit_cost", 0) or 0),
                "min_stock": float(row.get("min_stock", 0) or 0),
                "max_stock": float(row.get("max_stock") or 0) if pd.notna(row.get("max_stock")) else None,
                "reorder_point": float(row.get("reorder_point", 0) or 0),
                "safety_stock": float(row.get("safety_stock", 0) or 0),
                "lead_time_days": int(row.get("lead_time_days", 0) or 0),
            }
            if existing:
                for k, v in fields.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                p = Product(sku=sku, created_by=user.id, **fields)
                db.add(p)
                created += 1
        except Exception:
            errors += 1

    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


@router.post("/demand")
def import_demand(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    CSV/Excel columns: sku (or product_id), date (YYYY-MM-DD), quantity
    """
    try:
        df = read_file(file)
    except Exception:
        raise HTTPException(400, "Erro ao ler arquivo.")

    df.columns = df.columns.str.lower().str.strip()
    required = {"date", "quantity"}
    if not required.issubset(df.columns):
        raise HTTPException(400, f"Colunas obrigatórias: date, quantity, e sku ou product_id")

    created = errors = 0
    for _, row in df.iterrows():
        try:
            if "product_id" in df.columns:
                product_id = int(row["product_id"])
            else:
                sku = str(row["sku"]).strip()
                p = db.query(Product).filter(Product.sku == sku).first()
                if not p:
                    errors += 1
                    continue
                product_id = p.id

            d = DemandHistory(
                product_id=product_id,
                date=pd.to_datetime(row["date"]).date(),
                quantity=float(row["quantity"]),
                source="imported",
                created_by=user.id,
            )
            db.add(d)
            created += 1
        except Exception:
            errors += 1

    db.commit()
    return {"created": created, "errors": errors}


@router.post("/inventory")
def import_inventory(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    CSV/Excel columns: sku (or product_id), date, quantity_on_hand, quantity_reserved
    """
    try:
        df = read_file(file)
    except Exception:
        raise HTTPException(400, "Erro ao ler arquivo.")

    df.columns = df.columns.str.lower().str.strip()
    created = errors = 0

    for _, row in df.iterrows():
        try:
            if "product_id" in df.columns:
                product_id = int(row["product_id"])
            else:
                sku = str(row["sku"]).strip()
                p = db.query(Product).filter(Product.sku == sku).first()
                if not p:
                    errors += 1
                    continue
                product_id = p.id

            qty = float(row.get("quantity_on_hand", 0) or 0)
            reserved = float(row.get("quantity_reserved", 0) or 0)
            d = pd.to_datetime(row["date"]).date()
            existing = db.query(InventoryLevel).filter(
                InventoryLevel.product_id == product_id,
                InventoryLevel.date == d,
            ).first()
            if existing:
                existing.quantity_on_hand = qty
                existing.quantity_reserved = reserved
                existing.quantity_available = max(0.0, qty - reserved)
            else:
                db.add(InventoryLevel(
                    product_id=product_id,
                    date=d,
                    quantity_on_hand=qty,
                    quantity_reserved=reserved,
                    quantity_available=max(0.0, qty - reserved),
                ))
            created += 1
        except Exception:
            errors += 1

    db.commit()
    return {"created": created, "errors": errors}
