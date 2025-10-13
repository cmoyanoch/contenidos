"""
API endpoints para gestión de contenido generado del planificador
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time, datetime
from pydantic import BaseModel

# Usar conexión directa a la base de datos frontend
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Configurar conexión a frontend_db (usar la misma configuración que el servicio principal)
from utils.config import get_settings
settings = get_settings()
DATABASE_URL = settings.DATABASE_URL.replace("localhost:5433", "db:5432")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_database_session():
    """Obtiene sesión de base de datos para frontend_db"""
    return SessionLocal()

# Modelo simple para ContentGenerated (tabla en frontend_db)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, DateTime, Time, Date, ARRAY, Text, Boolean

Base = declarative_base()

class ContentGenerated(Base):
    __tablename__ = "content_generated"

    id = Column(Integer, primary_key=True, index=True)
    theme_id = Column(String)
    day_of_week = Column(Integer, nullable=False)
    content_type = Column(String(50), nullable=False)
    scheduled_time = Column(Time, nullable=False)
    scheduled_date = Column(Date, nullable=False)
    social_networks = Column(ARRAY(String), nullable=False, default=[])
    file_path = Column(String(500))
    file_type = Column(String(10))
    directory_type = Column(String(50))
    status = Column(String(20), nullable=False, default='pending')
    n8n_execution_id = Column(String(100))
    operation_id = Column(String)
    format_id = Column(Integer)
    preview_generated_at = Column(DateTime)
    published_at = Column(DateTime)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

# Importar servicio simplificado
from services.content_generated_service import ContentGeneratedService
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/api/v1/content-generated", tags=["content-generated"])

# Schemas Pydantic
class ContentGeneratedCreate(BaseModel):
    theme_id: str
    day_of_week: int
    content_type: str
    scheduled_time: str  # "HH:MM:SS"
    scheduled_date: str  # "YYYY-MM-DD"
    social_networks: List[str]
    format_id: Optional[int] = None

class ContentGeneratedUpdate(BaseModel):
    status: str
    file_path: Optional[str] = None
    operation_id: Optional[str] = None
    n8n_execution_id: Optional[str] = None

class ContentGeneratedResponse(BaseModel):
    id: int
    theme_id: str
    day_of_week: int
    content_type: str
    scheduled_time: str
    scheduled_date: str
    social_networks: List[str]
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    directory_type: Optional[str] = None
    status: str
    n8n_execution_id: Optional[str] = None
    operation_id: Optional[str] = None
    format_id: Optional[int] = None
    preview_generated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    file_url: Optional[str] = None

    class Config:
        from_attributes = True

class FileUploadRequest(BaseModel):
    content_id: int
    file_data: str  # base64
    file_type: str

@router.post("/", response_model=ContentGeneratedResponse)
async def create_content_generated(
    content_data: ContentGeneratedCreate,
    db: Session = Depends(get_database_session)
):
    """Crear un nuevo registro de contenido generado"""
    try:
        service = ContentGeneratedService(db)

        # Convertir strings a tipos apropiados
        scheduled_time = time.fromisoformat(content_data.scheduled_time)
        scheduled_date = date.fromisoformat(content_data.scheduled_date)

        content = service.create_content_record(
            theme_id=content_data.theme_id,
            day_of_week=content_data.day_of_week,
            content_type=content_data.content_type,
            scheduled_time=scheduled_time,
            scheduled_date=scheduled_date,
            social_networks=content_data.social_networks,
            format_id=content_data.format_id
        )

        # Convertir a response
        response = ContentGeneratedResponse(
            id=content.id,
            theme_id=content.theme_id,
            day_of_week=content.day_of_week,
            content_type=content.content_type,
            scheduled_time=content.scheduled_time.isoformat(),
            scheduled_date=content.scheduled_date.isoformat(),
            social_networks=content.social_networks,
            file_path=content.file_path,
            file_type=content.file_type,
            directory_type=content.directory_type,
            status=content.status,
            n8n_execution_id=content.n8n_execution_id,
            operation_id=content.operation_id,
            format_id=content.format_id,
            preview_generated_at=content.preview_generated_at,
            published_at=content.published_at,
            created_at=content.created_at,
            updated_at=content.updated_at,
            file_url=service.get_file_url(content.file_path) if content.file_path else None
        )

        logger.info(f"✅ Contenido generado creado: {content.id}")
        return response

    except Exception as e:
        logger.error(f"❌ Error creando contenido generado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ContentGeneratedResponse])
async def list_content_generated(
    theme_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    day_of_week: Optional[int] = Query(None),
    content_type: Optional[str] = Query(None),
    db: Session = Depends(get_database_session)
):
    """Listar contenido generado con filtros opcionales"""
    try:
        service = ContentGeneratedService(db)

        # Construir filtros
        filters = {}
        if theme_id:
            filters['theme_id'] = theme_id
        if status:
            filters['status'] = status
        if day_of_week:
            filters['day_of_week'] = day_of_week
        if content_type:
            filters['content_type'] = content_type

        # Obtener contenido (implementar filtros en el servicio)
        content_list = db.query(ContentGenerated).filter_by(**filters).all()

        # Convertir a response
        responses = []
        for content in content_list:
            response = ContentGeneratedResponse(
                id=content.id,
                theme_id=content.theme_id,
                day_of_week=content.day_of_week,
                content_type=content.content_type,
                scheduled_time=content.scheduled_time.isoformat(),
                scheduled_date=content.scheduled_date.isoformat(),
                social_networks=content.social_networks,
                file_path=content.file_path,
                file_type=content.file_type,
                directory_type=content.directory_type,
                status=content.status,
                n8n_execution_id=content.n8n_execution_id,
                operation_id=content.operation_id,
                format_id=content.format_id,
                preview_generated_at=content.preview_generated_at,
                published_at=content.published_at,
                created_at=content.created_at,
                updated_at=content.updated_at,
                file_url=service.get_file_url(content.file_path) if content.file_path else None
            )
            responses.append(response)

        logger.info(f"✅ Listando {len(responses)} registros de contenido generado")
        return responses

    except Exception as e:
        logger.error(f"❌ Error listando contenido generado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{content_id}", response_model=ContentGeneratedResponse)
async def get_content_generated(
    content_id: int,
    db: Session = Depends(get_database_session)
):
    """Obtener un registro específico de contenido generado"""
    try:
        content = db.query(ContentGenerated).filter(ContentGenerated.id == content_id).first()

        if not content:
            raise HTTPException(status_code=404, detail="Contenido generado no encontrado")

        service = ContentGeneratedService(db)
        response = ContentGeneratedResponse(
            id=content.id,
            theme_id=content.theme_id,
            day_of_week=content.day_of_week,
            content_type=content.content_type,
            scheduled_time=content.scheduled_time.isoformat(),
            scheduled_date=content.scheduled_date.isoformat(),
            social_networks=content.social_networks,
            file_path=content.file_path,
            file_type=content.file_type,
            directory_type=content.directory_type,
            status=content.status,
            n8n_execution_id=content.n8n_execution_id,
            operation_id=content.operation_id,
            format_id=content.format_id,
            preview_generated_at=content.preview_generated_at,
            published_at=content.published_at,
            created_at=content.created_at,
            updated_at=content.updated_at,
            file_url=service.get_file_url(content.file_path) if content.file_path else None
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo contenido generado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{content_id}", response_model=ContentGeneratedResponse)
async def update_content_generated(
    content_id: int,
    update_data: ContentGeneratedUpdate,
    db: Session = Depends(get_database_session)
):
    """Actualizar un registro de contenido generado"""
    try:
        service = ContentGeneratedService(db)

        success = service.update_content_status(
            content_id=content_id,
            status=update_data.status,
            file_path=update_data.file_path,
            operation_id=update_data.operation_id,
            n8n_execution_id=update_data.n8n_execution_id
        )

        if not success:
            raise HTTPException(status_code=404, detail="Contenido generado no encontrado")

        # Obtener el contenido actualizado
        content = db.query(ContentGenerated).filter(ContentGenerated.id == content_id).first()

        response = ContentGeneratedResponse(
            id=content.id,
            theme_id=content.theme_id,
            day_of_week=content.day_of_week,
            content_type=content.content_type,
            scheduled_time=content.scheduled_time.isoformat(),
            scheduled_date=content.scheduled_date.isoformat(),
            social_networks=content.social_networks,
            file_path=content.file_path,
            file_type=content.file_type,
            directory_type=content.directory_type,
            status=content.status,
            n8n_execution_id=content.n8n_execution_id,
            operation_id=content.operation_id,
            format_id=content.format_id,
            preview_generated_at=content.preview_generated_at,
            published_at=content.published_at,
            created_at=content.created_at,
            updated_at=content.updated_at,
            file_url=service.get_file_url(content.file_path) if content.file_path else None
        )

        logger.info(f"✅ Contenido generado actualizado: {content_id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando contenido generado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{content_id}/upload")
async def upload_content_file(
    content_id: int,
    upload_data: FileUploadRequest,
    db: Session = Depends(get_database_session)
):
    """Subir archivo para contenido generado"""
    try:
        service = ContentGeneratedService(db)

        # Obtener contenido
        content = db.query(ContentGenerated).filter(ContentGenerated.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Contenido generado no encontrado")

        # Guardar archivo
        success = service.save_base64_file(content.file_path, upload_data.file_data)

        if not success:
            raise HTTPException(status_code=500, detail="Error guardando archivo")

        # Actualizar estado
        service.update_content_status(content_id, 'completed', content.file_path)

        logger.info(f"✅ Archivo subido para contenido: {content_id}")
        return {"message": "Archivo subido exitosamente", "file_url": service.get_file_url(content.file_path)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error subiendo archivo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scheduled/{target_date}/{target_time}")
async def get_scheduled_content(
    target_date: str,
    target_time: str,
    db: Session = Depends(get_database_session)
):
    """Obtener contenido programado para una fecha y hora específica (para N8N cron)"""
    try:
        service = ContentGeneratedService(db)

        # Convertir strings a tipos apropiados
        scheduled_date = date.fromisoformat(target_date)
        scheduled_time = time.fromisoformat(target_time)

        content_list = service.get_content_for_scheduling(scheduled_date, scheduled_time)

        # Convertir a response
        responses = []
        for content in content_list:
            response = ContentGeneratedResponse(
                id=content.id,
                theme_id=content.theme_id,
                day_of_week=content.day_of_week,
                content_type=content.content_type,
                scheduled_time=content.scheduled_time.isoformat(),
                scheduled_date=content.scheduled_date.isoformat(),
                social_networks=content.social_networks,
                file_path=content.file_path,
                file_type=content.file_type,
                directory_type=content.directory_type,
                status=content.status,
                n8n_execution_id=content.n8n_execution_id,
                operation_id=content.operation_id,
                format_id=content.format_id,
                preview_generated_at=content.preview_generated_at,
                published_at=content.published_at,
                created_at=content.created_at,
                updated_at=content.updated_at,
                file_url=service.get_file_url(content.file_path) if content.file_path else None
            )
            responses.append(response)

        logger.info(f"✅ Contenido programado para {target_date} {target_time}: {len(responses)} items")
        return {"content": responses, "count": len(responses)}

    except Exception as e:
        logger.error(f"❌ Error obteniendo contenido programado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/theme/{theme_id}/summary")
async def get_theme_content_summary(
    theme_id: str,
    db: Session = Depends(get_database_session)
):
    """Obtener resumen de contenido de una temática"""
    try:
        service = ContentGeneratedService(db)
        summary = service.get_theme_content_summary(theme_id)

        logger.info(f"✅ Resumen obtenido para temática: {theme_id}")
        return summary

    except Exception as e:
        logger.error(f"❌ Error obteniendo resumen: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{content_id}")
async def delete_content_generated(
    content_id: int,
    db: Session = Depends(get_database_session)
):
    """Eliminar registro de contenido generado"""
    try:
        service = ContentGeneratedService(db)

        success = service.delete_content_record(content_id)

        if not success:
            raise HTTPException(status_code=404, detail="Contenido generado no encontrado")

        logger.info(f"✅ Contenido generado eliminado: {content_id}")
        return {"message": "Contenido generado eliminado exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando contenido generado: {e}")
        raise HTTPException(status_code=500, detail=str(e))
