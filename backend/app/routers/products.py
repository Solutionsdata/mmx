from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.product import Product, Supplier
from app.schemas.product import ProductIn, ProductOut, ProductUpdate, SupplierIn, SupplierOut
from app.deps import get_current_user

router = APIRouter()


# ── Suppliers ──────────────────────────────────────────────────────────────────

@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Supplier).order_by(Supplier.name).all()


@router.post("/suppliers", response_model=SupplierOut, status_code=201)
def create_supplier(data: SupplierIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = Supplier(**data.model_dump(), created_by=user.id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/suppliers/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Fornecedor não encontrado")
    db.delete(s)
    db.commit()


# ── Products ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Product).order_by(Product.name).all()


@router.post("/", response_model=ProductOut, status_code=201)
def create_product(data: ProductIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if db.query(Product).filter(Product.sku == data.sku).first():
        raise HTTPException(400, "SKU já cadastrado")
    p = Product(**data.model_dump(), created_by=user.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    return p


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    db.delete(p)
    db.commit()
