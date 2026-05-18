from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate, PasswordReset
from app.deps import get_admin_user
from app.services.auth import hash_password

router = APIRouter()


@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(get_admin_user)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_admin is not None:
        user.is_admin = data.is_admin
    if data.clear_assinatura:
        user.assinatura_ate = None
    elif data.assinatura_ate is not None:
        user.assinatura_ate = data.assinatura_ate
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db.delete(user)
    db.commit()


@router.post("/users/{user_id}/reset-password", status_code=200)
def reset_password(user_id: int, data: PasswordReset, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.hashed_password = hash_password(data.password)
    db.commit()
    return {"message": "Senha redefinida com sucesso"}
