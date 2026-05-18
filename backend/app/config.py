from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://localhost/mmx_db"
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    FRONTEND_URL: str = "http://localhost:5173"
    ADMIN_EMAIL: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
