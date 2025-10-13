"""
Endpoints para gestión de contenidos con formatos
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from typing import Optional
import logging
from datetime import datetime
from pydantic import BaseModel

from models.database import get_database_session

logger = logging.getLogger(__name__)

# Router para contenidos
content_router = APIRouter(prefix="/api/v1/content", tags=["content"])


# Schemas Pydantic
class ContentCreateRequest(BaseModel):
    content_type: str  # video, image, post
    title: str
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    format_type: Optional[str] = None  # video o image
    format_id: Optional[int] = None  # ID del formato de video
    image_format_id: Optional[int] = None  # ID del formato de imagen
    is_primary: bool = True
    usage_context: str = "main_content"
    generation_params: dict = {}
    social_networks: list = []
    theme_id: Optional[str] = None


@content_router.post("/")
async def create_content(request: ContentCreateRequest):
    """
    Crea un nuevo contenido con su formato asociado.

    **Parámetros:**
    - content_type: Tipo de contenido (video, image, post)
    - title: Título del contenido
    - description: Descripción del contenido
    - scheduled_date: Fecha programada (YYYY-MM-DD)
    - scheduled_time: Hora programada (HH:MM)
    - format_type: Tipo de formato (video o image)
    - format_id: ID del formato de video
    - image_format_id: ID del formato de imagen
    - is_primary: Si es el formato principal
    - usage_context: Contexto de uso
    - generation_params: Parámetros de generación
    - social_networks: Redes sociales donde publicar
    - theme_id: ID del tema (opcional)
    """
    try:
        db_session = get_database_session()
        try:
            # Validar formato según tipo de contenido
            if request.content_type in ['video', 'image']:
                if not request.format_type:
                    raise HTTPException(
                        status_code=400,
                        detail="format_type es requerido para contenido de tipo video o image"
                    )

                if request.format_type == 'video' and not request.format_id:
                    raise HTTPException(
                        status_code=400,
                        detail="format_id es requerido para contenido de tipo video"
                    )

                if request.format_type == 'image' and not request.image_format_id:
                    raise HTTPException(
                        status_code=400,
                        detail="image_format_id es requerido para contenido de tipo image"
                    )

                # Validar que el formato existe
                if request.format_type == 'video':
                    check_format = text("SELECT id FROM video_formats WHERE id = :id AND is_active = true")
                    result = db_session.execute(check_format, {"id": request.format_id})
                    if not result.fetchone():
                        raise HTTPException(status_code=404, detail=f"Formato de video {request.format_id} no encontrado")

                elif request.format_type == 'image':
                    check_format = text("SELECT id FROM image_formats WHERE id = :id AND is_active = true")
                    result = db_session.execute(check_format, {"id": request.image_format_id})
                    if not result.fetchone():
                        raise HTTPException(status_code=404, detail=f"Formato de imagen {request.image_format_id} no encontrado")

            # Determinar día de la semana (1=Lunes, 7=Domingo)
            day_of_week = None
            if request.scheduled_date:
                try:
                    date_obj = datetime.strptime(request.scheduled_date, "%Y-%m-%d")
                    day_of_week = date_obj.isoweekday()  # 1=Lunes, 7=Domingo
                except ValueError:
                    pass

            # Insertar contenido en content_generated
            insert_query = text("""
                INSERT INTO content_generated (
                    theme_id, day_of_week, content_type, scheduled_time, scheduled_date,
                    social_networks, status, format_id, image_format_id, format_type,
                    is_primary, usage_context, generation_params,
                    created_at, updated_at
                ) VALUES (
                    :theme_id, :day_of_week, :content_type, :scheduled_time, :scheduled_date,
                    :social_networks, 'pending', :format_id, :image_format_id, :format_type,
                    :is_primary, :usage_context, :generation_params::jsonb,
                    NOW(), NOW()
                ) RETURNING id, content_type, scheduled_date, scheduled_time, status
            """)

            result = db_session.execute(insert_query, {
                "theme_id": request.theme_id,
                "day_of_week": day_of_week,
                "content_type": request.content_type,
                "scheduled_time": request.scheduled_time,
                "scheduled_date": request.scheduled_date,
                "social_networks": request.social_networks,
                "format_id": request.format_id,
                "image_format_id": request.image_format_id,
                "format_type": request.format_type,
                "is_primary": request.is_primary,
                "usage_context": request.usage_context,
                "generation_params": str(request.generation_params).replace("'", '"')
            })

            new_content = result.fetchone()
            content_id = new_content.id

            # Actualizar contador de uso del formato
            if request.format_type == 'video' and request.format_id:
                update_usage = text("""
                    UPDATE video_formats
                    SET usage_count = usage_count + 1,
                        last_used_at = NOW(),
                        updated_at = NOW()
                    WHERE id = :id
                """)
                db_session.execute(update_usage, {"id": request.format_id})

            elif request.format_type == 'image' and request.image_format_id:
                update_usage = text("""
                    UPDATE image_formats
                    SET usage_count = usage_count + 1,
                        last_used_at = NOW(),
                        updated_at = NOW()
                    WHERE id = :id
                """)
                db_session.execute(update_usage, {"id": request.image_format_id})

            db_session.commit()

            logger.info(f"✅ Contenido creado: {request.title} (ID: {content_id})")

            return {
                "success": True,
                "message": f"Contenido '{request.title}' creado exitosamente",
                "content_id": content_id,
                "content_type": new_content.content_type,
                "scheduled_date": new_content.scheduled_date.isoformat() if new_content.scheduled_date else None,
                "scheduled_time": str(new_content.scheduled_time) if new_content.scheduled_time else None,
                "status": new_content.status
            }

        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando contenido: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@content_router.get("/")
async def list_contents(
    content_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Lista todos los contenidos generados.

    **Parámetros:**
    - content_type: Filtrar por tipo (video, image, post)
    - status: Filtrar por estado (pending, processing, completed, failed)
    - limit: Número de resultados (default: 50)
    - offset: Desplazamiento para paginación (default: 0)
    """
    try:
        db_session = get_database_session()
        try:
            # Construir query base
            query = """
                SELECT
                    cg.id, cg.content_type, cg.scheduled_date, cg.scheduled_time,
                    cg.status, cg.format_type, cg.format_id, cg.image_format_id,
                    cg.is_primary, cg.usage_context, cg.file_path,
                    cg.created_at, cg.updated_at,
                    CASE
                        WHEN cg.format_type = 'video' THEN vf.format_name
                        WHEN cg.format_type = 'image' THEN imgf.format_name
                    END AS format_name
                FROM content_generated cg
                LEFT JOIN video_formats vf ON cg.format_type = 'video' AND cg.format_id = vf.id
                LEFT JOIN image_formats imgf ON cg.format_type = 'image' AND cg.image_format_id = imgf.id
                WHERE cg.status != 'deleted'
            """
            params = {}

            # Aplicar filtros
            if content_type:
                query += " AND cg.content_type = :content_type"
                params["content_type"] = content_type

            if status:
                query += " AND cg.status = :status"
                params["status"] = status

            # Ordenar y paginar
            query += " ORDER BY cg.scheduled_date DESC, cg.created_at DESC LIMIT :limit OFFSET :offset"
            params["limit"] = limit
            params["offset"] = offset

            result = db_session.execute(text(query), params)
            rows = result.fetchall()

            # Convertir a diccionarios
            contents = []
            for row in rows:
                contents.append({
                    "id": row.id,
                    "content_type": row.content_type,
                    "scheduled_date": row.scheduled_date.isoformat() if row.scheduled_date else None,
                    "scheduled_time": str(row.scheduled_time) if row.scheduled_time else None,
                    "status": row.status,
                    "format_type": row.format_type,
                    "format_id": row.format_id,
                    "image_format_id": row.image_format_id,
                    "format_name": row.format_name,
                    "is_primary": row.is_primary,
                    "usage_context": row.usage_context,
                    "file_path": row.file_path,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None
                })

            return {
                "success": True,
                "count": len(contents),
                "contents": contents
            }

        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error listando contenidos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@content_router.get("/{content_id}")
async def get_content(content_id: int):
    """
    Obtiene los detalles de un contenido específico.

    **Parámetros:**
    - content_id: ID del contenido
    """
    try:
        db_session = get_database_session()
        try:
            query = text("""
                SELECT
                    cg.*,
                    CASE
                        WHEN cg.format_type = 'video' THEN vf.format_name
                        WHEN cg.format_type = 'image' THEN imgf.format_name
                    END AS format_name,
                    CASE
                        WHEN cg.format_type = 'video' THEN vf.category
                        WHEN cg.format_type = 'image' THEN imgf.category
                    END AS format_category
                FROM content_generated cg
                LEFT JOIN video_formats vf ON cg.format_type = 'video' AND cg.format_id = vf.id
                LEFT JOIN image_formats imgf ON cg.format_type = 'image' AND cg.image_format_id = imgf.id
                WHERE cg.id = :id
            """)

            result = db_session.execute(query, {"id": content_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Contenido {content_id} no encontrado")

            # Convertir a diccionario
            content_data = dict(row._mapping)

            # Convertir timestamps a ISO format
            for key in ['created_at', 'updated_at', 'scheduled_date', 'preview_generated_at', 'published_at']:
                if content_data.get(key):
                    content_data[key] = content_data[key].isoformat()

            # Convertir scheduled_time a string
            if content_data.get('scheduled_time'):
                content_data['scheduled_time'] = str(content_data['scheduled_time'])

            return {
                "success": True,
                "content": content_data
            }

        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo contenido: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@content_router.delete("/{content_id}")
async def delete_content(content_id: int):
    """
    Elimina un contenido (soft delete).

    **Parámetros:**
    - content_id: ID del contenido a eliminar
    """
    try:
        db_session = get_database_session()
        try:
            # Verificar que el contenido existe
            check_query = text("SELECT id, content_type FROM content_generated WHERE id = :id")
            result = db_session.execute(check_query, {"id": content_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Contenido {content_id} no encontrado")

            content_type = row.content_type

            # Soft delete: cambiar status a 'deleted'
            delete_query = text("""
                UPDATE content_generated
                SET status = 'deleted', updated_at = NOW()
                WHERE id = :id
            """)
            db_session.execute(delete_query, {"id": content_id})
            db_session.commit()

            logger.info(f"✅ Contenido eliminado: {content_type} (ID: {content_id})")

            return {
                "success": True,
                "message": f"Contenido {content_id} eliminado exitosamente",
                "content_id": content_id
            }

        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando contenido: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@content_router.get("/stats/summary")
async def get_content_stats():
    """
    Obtiene estadísticas generales de contenidos.
    """
    try:
        db_session = get_database_session()
        try:
            stats_query = text("""
                SELECT
                    COUNT(*) as total_contents,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_contents,
                    COUNT(*) FILTER (WHERE status = 'processing') as processing_contents,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_contents,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_contents,
                    COUNT(DISTINCT content_type) as unique_types,
                    COUNT(DISTINCT format_type) as unique_format_types
                FROM content_generated
                WHERE status != 'deleted'
            """)

            result = db_session.execute(stats_query)
            row = result.fetchone()

            return {
                "success": True,
                "stats": {
                    "total_contents": row.total_contents,
                    "pending_contents": row.pending_contents,
                    "processing_contents": row.processing_contents,
                    "completed_contents": row.completed_contents,
                    "failed_contents": row.failed_contents,
                    "unique_types": row.unique_types,
                    "unique_format_types": row.unique_format_types
                }
            }

        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas de contenidos: {e}")
        raise HTTPException(status_code=500, detail=str(e))
