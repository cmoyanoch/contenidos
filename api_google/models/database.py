"""
Modelos de base de datos para operaciones de video y logs de Google APIs
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Boolean, JSON, Time, Date, ForeignKey, ARRAY, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import create_engine
from datetime import datetime
from utils.config import get_settings

Base = declarative_base()

class VideoOperation(Base):
    """Modelo para operaciones de generación de video"""
    __tablename__ = "video_operations"
    __table_args__ = {"schema": "public"}

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False, default="processing")  # processing, completed, failed
    prompt = Column(Text, nullable=False)
    type = Column(String, nullable=False, default="text_to_video")  # text_to_video, image_to_video, image_to_video_base64
    duration = Column(Integer, default=6)
    aspect_ratio = Column(String, default="16:9")
    negative_prompt = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)

    # Resultados
    video_url = Column(Text, nullable=True)
    filename = Column(String, nullable=True)
    local_path = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)

    # Metadata para image-to-video
    image_url = Column(Text, nullable=True)
    image_content_type = Column(String, nullable=True)

    # Google API operation ID
    google_operation_id = Column(String, nullable=True)


class GoogleApiCall(Base):
    """Modelo para almacenar todas las llamadas API directas a Google"""
    __tablename__ = "google_api_calls"
    __table_args__ = {"schema": "public"}

    id = Column(String, primary_key=True)  # UUID único para cada call
    operation_id = Column(String, nullable=True)  # FK a VideoOperation si aplica

    # Detalles de la API call
    api_type = Column(String, nullable=False)  # 'veo', 'gemini', 'genai', etc.
    endpoint = Column(String, nullable=False)  # URL del endpoint de Google
    method = Column(String, nullable=False, default="POST")  # HTTP method

    # Request completo
    request_headers = Column(JSON, nullable=True)  # Headers enviados (sin API keys sensibles)
    request_body = Column(JSON, nullable=False)  # Body completo enviado a Google
    request_params = Column(JSON, nullable=True)  # Query parameters si los hay

    # Response completo
    response_status_code = Column(Integer, nullable=True)  # HTTP status code
    response_headers = Column(JSON, nullable=True)  # Response headers
    response_body = Column(JSON, nullable=True)  # Response body completo de Google

    # Metadata y timing
    request_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    response_timestamp = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)  # Duración en milisegundos

    # Status y error tracking
    status = Column(String, nullable=False, default="pending")  # pending, success, error, timeout
    error_message = Column(Text, nullable=True)
    google_error_code = Column(String, nullable=True)  # Código de error específico de Google

    # Contexto adicional
    user_agent = Column(String, nullable=True)
    client_ip = Column(String, nullable=True)

    # Timestamps de auditoría
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContentGenerated(Base):
    """Modelo para contenido generado del planificador"""
    __tablename__ = "content_generated"
    __table_args__ = {"schema": "api_google"}

    id = Column(Integer, primary_key=True, index=True)
    theme_id = Column(String, ForeignKey("theme_planning.id", ondelete="CASCADE"))
    day_of_week = Column(Integer, nullable=False)  # 1=Lunes, 7=Domingo
    content_type = Column(String(50), nullable=False)  # video_person, image_stats, etc.
    scheduled_time = Column(Time, nullable=False)
    scheduled_date = Column(Date, nullable=False)
    social_networks = Column(ARRAY(String), nullable=False, default=[])
    file_path = Column(String(500))
    file_type = Column(String(10))
    directory_type = Column(String(50))
    status = Column(String(20), nullable=False, default='pending')  # pending, generating, completed, published, failed
    n8n_execution_id = Column(String(100))
    operation_id = Column(String, ForeignKey("video_operations.id", ondelete="SET NULL"))
    format_id = Column(Integer, ForeignKey("video_formats.id", ondelete="SET NULL"))
    preview_generated_at = Column(DateTime)
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Configuración de base de datos
def get_database_engine():
    """Obtiene el engine de base de datos"""
    settings = get_settings()
    return create_engine(settings.DATABASE_URL)

def get_database_session():
    """Obtiene una sesión de base de datos"""
    engine = get_database_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def create_tables():
    """Crea las tablas en la base de datos (solo si CREATE_TABLES=true)"""
    import os
    create_tables_env = os.getenv("CREATE_TABLES", "false").lower()

    if create_tables_env != "true":
        print("⚠️  CREATE_TABLES no está configurado como 'true' - omitiendo creación de tablas")
        print("   Las tablas deben ser creadas manualmente o importadas desde un dump SQL")
        return

    print("✅ CREATE_TABLES=true - creando tablas automáticamente")
    engine = get_database_engine()
    Base.metadata.create_all(bind=engine)
