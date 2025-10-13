"""
Servicio para gestión de contenido generado del planificador
Integra con tablas existentes: theme_planning, content_schedule, video_operations, video_formats
"""
import os
import base64
from datetime import datetime, date, time
from pathlib import Path
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

# Modelo ContentGenerated definido aquí para evitar problemas de importación
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
from utils.logger import setup_logger

logger = setup_logger(__name__)

class ContentGeneratedService:
    """Servicio para gestionar contenido generado del planificador"""

    def __init__(self, db_session: Session = None):
        if db_session is None:
            # Crear conexión a frontend_db si no se proporciona
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from utils.config import get_settings
            settings = get_settings()
            DATABASE_URL = settings.DATABASE_URL.replace("localhost:5433", "db:5432")
            engine = create_engine(DATABASE_URL)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            self.db = SessionLocal()
        else:
            self.db = db_session

        # Mapeo de tipos de contenido a directorios
        self.content_directories = {
            'video_person': 'content_generated/videos/persona_realista',
            'video_avatar': 'content_generated/videos/avatar_animado',
            'image_stats': 'content_generated/images/estadisticas',
            'post_cta': 'content_generated/posts/cta_posts',
            'content_manual': 'content_generated/images/manual_content'
        }

        # Mapeo de tipos de contenido a extensiones
        self.content_extensions = {
            'video_person': '.mp4',
            'video_avatar': '.mp4',
            'image_stats': '.png',
            'post_cta': '.txt',
            'content_manual': '.png'
        }

    def get_content_directory(self, content_type: str) -> str:
        """Obtiene el directorio según el tipo de contenido"""
        return self.content_directories.get(content_type, 'content_generated/unknown')

    def get_content_extension(self, content_type: str) -> str:
        """Obtiene la extensión según el tipo de contenido"""
        return self.content_extensions.get(content_type, '.bin')

    def generate_file_path(self, theme_id: str, day_of_week: int, content_type: str) -> str:
        """Genera una ruta única de archivo"""
        directory = self.get_content_directory(content_type)
        extension = self.get_content_extension(content_type)
        timestamp = int(datetime.now().timestamp())

        return f"{directory}/{theme_id}_{day_of_week}_{timestamp}{extension}"

    def get_file_url(self, file_path: str) -> str:
        """Convierte ruta de archivo a URL del API"""
        return f"http://api_google:8000/api/v1/uploads/{file_path}"

    def create_content_record(
        self,
        theme_id: str,
        day_of_week: int,
        content_type: str,
        scheduled_time: time,
        scheduled_date: date,
        social_networks: List[str],
        format_id: Optional[int] = None
    ) -> ContentGenerated:
        """Crea un registro de contenido generado"""
        try:
            # Generar ruta de archivo
            file_path = self.generate_file_path(theme_id, day_of_week, content_type)
            directory_type = content_type.replace('_', ' ')

            content = ContentGenerated(
                theme_id=theme_id,
                day_of_week=day_of_week,
                content_type=content_type,
                scheduled_time=scheduled_time,
                scheduled_date=scheduled_date,
                social_networks=social_networks,
                file_path=file_path,
                file_type=self.get_content_extension(content_type).replace('.', ''),
                directory_type=directory_type,
                status='pending',
                format_id=format_id
            )

            self.db.add(content)
            self.db.commit()
            self.db.refresh(content)

            logger.info(f"✅ Registro de contenido creado: {content.id}")
            return content

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Error creando registro de contenido: {e}")
            raise

    def get_content_by_theme_and_day(
        self,
        theme_id: str,
        day_of_week: int,
        content_type: str
    ) -> Optional[ContentGenerated]:
        """Obtiene contenido por temática, día y tipo"""
        try:
            content = self.db.query(ContentGenerated).filter(
                ContentGenerated.theme_id == theme_id,
                ContentGenerated.day_of_week == day_of_week,
                ContentGenerated.content_type == content_type
            ).first()

            return content

        except Exception as e:
            logger.error(f"❌ Error obteniendo contenido: {e}")
            return None

    def update_content_status(
        self,
        content_id: int,
        status: str,
        file_path: Optional[str] = None,
        operation_id: Optional[str] = None,
        n8n_execution_id: Optional[str] = None
    ) -> bool:
        """Actualiza el estado del contenido"""
        try:
            content = self.db.query(ContentGenerated).filter(
                ContentGenerated.id == content_id
            ).first()

            if not content:
                logger.error(f"❌ Contenido no encontrado: {content_id}")
                return False

            content.status = status

            if file_path:
                content.file_path = file_path
            if operation_id:
                content.operation_id = operation_id
            if n8n_execution_id:
                content.n8n_execution_id = n8n_execution_id

            if status == 'completed':
                content.preview_generated_at = datetime.now()
            elif status == 'published':
                content.published_at = datetime.now()

            self.db.commit()
            logger.info(f"✅ Estado actualizado: {content_id} -> {status}")
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Error actualizando estado: {e}")
            return False

    def get_content_for_scheduling(self, target_date: date, target_time: time) -> List[ContentGenerated]:
        """Obtiene contenido listo para programar en una fecha/hora específica"""
        try:
            content_list = self.db.query(ContentGenerated).filter(
                ContentGenerated.scheduled_date == target_date,
                ContentGenerated.scheduled_time == target_time,
                ContentGenerated.status == 'completed'
            ).all()

            logger.info(f"✅ Contenido encontrado para {target_date} {target_time}: {len(content_list)} items")
            return content_list

        except Exception as e:
            logger.error(f"❌ Error obteniendo contenido para programar: {e}")
            return []

    def save_generated_file(self, file_path: str, file_data: bytes) -> bool:
        """Guarda archivo generado en el sistema de archivos"""
        try:
            # Crear directorio si no existe
            full_path = Path("uploads") / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)

            # Guardar archivo
            with open(full_path, 'wb') as f:
                f.write(file_data)

            logger.info(f"✅ Archivo guardado: {full_path}")
            return True

        except Exception as e:
            logger.error(f"❌ Error guardando archivo: {e}")
            return False

    def save_base64_file(self, file_path: str, base64_data: str) -> bool:
        """Guarda archivo desde datos base64"""
        try:
            # Decodificar base64
            file_data = base64.b64decode(base64_data)
            return self.save_generated_file(file_path, file_data)

        except Exception as e:
            logger.error(f"❌ Error guardando archivo base64: {e}")
            return False

    def check_file_exists(self, file_path: str) -> bool:
        """Verifica si un archivo existe"""
        full_path = Path("uploads") / file_path
        return full_path.exists()

    def get_theme_content_summary(self, theme_id: str) -> Dict[str, Any]:
        """Obtiene resumen de contenido de una temática"""
        try:
            content_list = self.db.query(ContentGenerated).filter(
                ContentGenerated.theme_id == theme_id
            ).all()

            summary = {
                'total_content': len(content_list),
                'by_status': {},
                'by_type': {},
                'by_day': {}
            }

            for content in content_list:
                # Por estado
                status = content.status
                summary['by_status'][status] = summary['by_status'].get(status, 0) + 1

                # Por tipo
                content_type = content.content_type
                summary['by_type'][content_type] = summary['by_type'].get(content_type, 0) + 1

                # Por día
                day = content.day_of_week
                summary['by_day'][day] = summary['by_day'].get(day, 0) + 1

            return summary

        except Exception as e:
            logger.error(f"❌ Error obteniendo resumen de contenido: {e}")
            return {}

    def delete_content_record(self, content_id: int) -> bool:
        """Elimina un registro de contenido"""
        try:
            content = self.db.query(ContentGenerated).filter(
                ContentGenerated.id == content_id
            ).first()

            if not content:
                logger.error(f"❌ Contenido no encontrado: {content_id}")
                return False

            # Eliminar archivo físico si existe
            if content.file_path and self.check_file_exists(content.file_path):
                full_path = Path("uploads") / content.file_path
                try:
                    full_path.unlink()
                    logger.info(f"✅ Archivo eliminado: {full_path}")
                except Exception as e:
                    logger.warning(f"⚠️ No se pudo eliminar archivo: {e}")

            # Eliminar registro
            self.db.delete(content)
            self.db.commit()

            logger.info(f"✅ Registro de contenido eliminado: {content_id}")
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Error eliminando contenido: {e}")
            return False
