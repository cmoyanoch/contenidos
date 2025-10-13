"""
Configuración de la aplicación
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Configuración de la aplicación"""

    # Google API Configuration (Gemini API only)
    GOOGLE_API_KEY: str

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5433/frontend_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6380/0"
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File Upload
    MAX_FILE_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "allow"
    }

# Instancia global de configuración
_settings: Optional[Settings] = None

def get_settings() -> Settings:
    """Obtiene la configuración de la aplicación"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
