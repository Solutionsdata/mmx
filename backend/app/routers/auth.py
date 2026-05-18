from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserOut
from app.services.auth import hash_password, verify_password, create_access_token, decode_token
from app.config import settings
from datetime import datetime

router = APIRouter()
bearer = HTTPBearer()


@router.post("/register", status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    is_admin = data.email == settings.ADMIN_EMAIL
    user = User(
        nome=data.nome,
        email=data.email,
        empresa=data.empresa,
        cargo=data.cargo,
        hashed_password=hash_password(data.password),
        is_active=is_admin,
        is_admin=is_admin,
    )
    db.add(user)
    db.commit()
    return {"message": "Cadastro realizado. Aguarde aprovação do administrador."}


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Conta inativa ou aguardando aprovação")
    if not user.is_admin and user.assinatura_ate and user.assinatura_ate < datetime.utcnow():
        raise HTTPException(status_code=402, detail="Assinatura vencida. Contate o administrador.")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.get("/me", response_model=UserOut)
def me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user
