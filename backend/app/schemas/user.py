from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    nome: str
    email: EmailStr
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    nome: str
    email: str
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    is_active: bool
    is_admin: bool
    assinatura_ate: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    assinatura_ate: Optional[datetime] = None
    clear_assinatura: Optional[bool] = None


class PasswordReset(BaseModel):
    password: str
