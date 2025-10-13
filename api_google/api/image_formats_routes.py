"""
Endpoints para gestión de formatos de imágenes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy import text
from typing import Optional, List
import logging
from datetime import datetime

from models.database import get_database_session

logger = logging.getLogger(__name__)

# Router para formatos de imágenes
image_formats_router = APIRouter(prefix="/api/v1/image-formats", tags=["image-formats"])


@image_formats_router.get("/")
async def list_image_formats(
    category: Optional[str] = None,
    is_active: bool = True,
    limit: int = 50,
    offset: int = 0
):
    """
    Lista todos los formatos de imágenes disponibles.

    **Parámetros:**
    - category: Filtrar por categoría (social-media, marketing, product, infographic, banner)
    - is_active: Solo formatos activos (default: true)
    - limit: Número de resultados (default: 50)
    - offset: Desplazamiento para paginación (default: 0)
    """
    try:
        db_session = get_database_session()
        try:
            # Construir query base
            query = """
                SELECT
                    id, format_name, description, aspect_ratio, file_format,
                    category, visual_style, recommended_ai_model,
                    usage_count, success_rate, is_active, is_template,
                    created_at, updated_at, last_used_at
                FROM image_formats
                WHERE 1=1
            """
            params = {}

            # Aplicar filtros
            if is_active:
                query += " AND is_active = true"

            if category:
                query += " AND category = :category"
                params["category"] = category

            # Ordenar y paginar
            query += " ORDER BY usage_count DESC, created_at DESC LIMIT :limit OFFSET :offset"
            params["limit"] = limit
            params["offset"] = offset

            result = db_session.execute(text(query), params)
            rows = result.fetchall()

            # Convertir a diccionarios
            formats = []
            for row in rows:
                formats.append({
                    "id": row.id,
                    "format_name": row.format_name,
                    "description": row.description,
                    "aspect_ratio": row.aspect_ratio,
                    "file_format": row.file_format,
                    "category": row.category,
                    "visual_style": row.visual_style,
                    "recommended_ai_model": row.recommended_ai_model,
                    "usage_count": row.usage_count,
                    "success_rate": float(row.success_rate) if row.success_rate else 0.0,
                    "is_active": row.is_active,
                    "is_template": row.is_template,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                    "last_used_at": row.last_used_at.isoformat() if row.last_used_at else None
                })

            return {
                "success": True,
                "count": len(formats),
                "formats": formats
            }

        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error listando formatos de imágenes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@image_formats_router.get("/{format_id}")
async def get_image_format(format_id: int):
    """
    Obtiene los detalles de un formato de imagen específico.

    **Parámetros:**
    - format_id: ID del formato
    """
    try:
        db_session = get_database_session()
        try:
            query = text("""
                SELECT * FROM image_formats WHERE id = :id
            """)
            result = db_session.execute(query, {"id": format_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Formato {format_id} no encontrado")

            # Convertir a diccionario
            format_data = dict(row._mapping)

            # Convertir timestamps a ISO format
            for key in ['created_at', 'updated_at', 'last_used_at']:
                if format_data.get(key):
                    format_data[key] = format_data[key].isoformat()

            # Convertir success_rate a float
            if format_data.get('success_rate'):
                format_data['success_rate'] = float(format_data['success_rate'])

            return {
                "success": True,
                "format": format_data
            }

        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo formato de imagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@image_formats_router.post("/")
async def create_image_format(
    format_name: str = Form(...),
    description: Optional[str] = Form(None),
    aspect_ratio: Optional[str] = Form(None),
    file_format: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    visual_style: Optional[str] = Form(None),
    color_palette: Optional[str] = Form(None),
    composition_style: Optional[str] = Form(None),
    replication_prompt: Optional[str] = Form(None),
    recommended_ai_model: Optional[str] = Form(None),
    recommended_resolution: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_active: bool = Form(True),
    is_template: bool = Form(True)
):
    """
    Crea un nuevo formato de imagen.

    **Parámetros:**
    - format_name: Nombre del formato (requerido)
    - description: Descripción del formato
    - aspect_ratio: Proporción (16:9, 1:1, 4:3, 9:16, 21:9)
    - file_format: Formato de archivo (PNG, JPG, WEBP, SVG)
    - category: Categoría (social-media, marketing, product, infographic, banner)
    - visual_style: Descripción del estilo visual
    - color_palette: Paleta de colores (JSON string)
    - composition_style: Estilo de composición
    - replication_prompt: Prompt para replicación
    - recommended_ai_model: Modelo de IA recomendado
    - recommended_resolution: Resolución recomendada
    - tags: Tags (JSON string)
    - is_active: Si está activo
    - is_template: Si es un template
    """
    try:
        db_session = get_database_session()
        try:
            # Insertar nuevo formato
            insert_query = text("""
                INSERT INTO image_formats (
                    format_name, description, aspect_ratio, file_format,
                    category, visual_style, color_palette, composition_style,
                    replication_prompt, recommended_ai_model, recommended_resolution,
                    tags, is_active, is_template, created_at, updated_at
                ) VALUES (
                    :format_name, :description, :aspect_ratio, :file_format,
                    :category, :visual_style, :color_palette, :composition_style,
                    :replication_prompt, :recommended_ai_model, :recommended_resolution,
                    :tags, :is_active, :is_template, NOW(), NOW()
                ) RETURNING id
            """)

            result = db_session.execute(insert_query, {
                "format_name": format_name,
                "description": description,
                "aspect_ratio": aspect_ratio,
                "file_format": file_format,
                "category": category,
                "visual_style": visual_style,
                "color_palette": color_palette,
                "composition_style": composition_style,
                "replication_prompt": replication_prompt,
                "recommended_ai_model": recommended_ai_model,
                "recommended_resolution": recommended_resolution,
                "tags": tags,
                "is_active": is_active,
                "is_template": is_template
            })

            new_id = result.fetchone()[0]
            db_session.commit()

            logger.info(f"✅ Formato de imagen creado: {format_name} (ID: {new_id})")

            return {
                "success": True,
                "message": f"Formato '{format_name}' creado exitosamente",
                "format_id": new_id
            }

        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error creando formato de imagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@image_formats_router.put("/{format_id}")
async def update_image_format(
    format_id: int,
    format_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    aspect_ratio: Optional[str] = Form(None),
    file_format: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    visual_style: Optional[str] = Form(None),
    color_palette: Optional[str] = Form(None),
    composition_style: Optional[str] = Form(None),
    replication_prompt: Optional[str] = Form(None),
    recommended_ai_model: Optional[str] = Form(None),
    recommended_resolution: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    is_template: Optional[bool] = Form(None)
):
    """
    Actualiza un formato de imagen existente.

    **Parámetros:**
    - format_id: ID del formato a actualizar
    - Todos los demás campos son opcionales
    """
    try:
        db_session = get_database_session()
        try:
            # Verificar que el formato existe
            check_query = text("SELECT id, format_name FROM image_formats WHERE id = :id")
            result = db_session.execute(check_query, {"id": format_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Formato {format_id} no encontrado")

            # Construir query de actualización dinámicamente
            update_fields = []
            params = {"id": format_id}

            fields_to_update = {
                "format_name": format_name,
                "description": description,
                "aspect_ratio": aspect_ratio,
                "file_format": file_format,
                "category": category,
                "visual_style": visual_style,
                "color_palette": color_palette,
                "composition_style": composition_style,
                "replication_prompt": replication_prompt,
                "recommended_ai_model": recommended_ai_model,
                "recommended_resolution": recommended_resolution,
                "tags": tags,
                "is_active": is_active,
                "is_template": is_template
            }

            for field, value in fields_to_update.items():
                if value is not None:
                    update_fields.append(f"{field} = :{field}")
                    params[field] = value

            if not update_fields:
                raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")

            # Agregar updated_at
            update_fields.append("updated_at = NOW()")

            update_query = text(f"""
                UPDATE image_formats
                SET {', '.join(update_fields)}
                WHERE id = :id
            """)

            db_session.execute(update_query, params)
            db_session.commit()

            logger.info(f"✅ Formato de imagen actualizado: {row.format_name} (ID: {format_id})")

            return {
                "success": True,
                "message": f"Formato '{row.format_name}' actualizado exitosamente",
                "format_id": format_id
            }

        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando formato de imagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@image_formats_router.delete("/{format_id}")
async def delete_image_format(format_id: int):
    """
    Elimina un formato de imagen (soft delete).

    **Parámetros:**
    - format_id: ID del formato a eliminar
    """
    try:
        db_session = get_database_session()
        try:
            # Verificar que el formato existe
            check_query = text("SELECT id, format_name FROM image_formats WHERE id = :id")
            result = db_session.execute(check_query, {"id": format_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Formato {format_id} no encontrado")

            format_name = row.format_name

            # Soft delete: marcar como inactivo
            delete_query = text("UPDATE image_formats SET is_active = false, updated_at = NOW() WHERE id = :id")
            db_session.execute(delete_query, {"id": format_id})
            db_session.commit()

            logger.info(f"✅ Formato de imagen eliminado: {format_name}")

            return {
                "success": True,
                "message": f"Formato '{format_name}' eliminado exitosamente",
                "format_id": format_id
            }

        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando formato de imagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@image_formats_router.get("/stats/summary")
async def get_image_formats_stats():
    """
    Obtiene estadísticas generales de formatos de imágenes.
    """
    try:
        db_session = get_database_session()
        try:
            stats_query = text("""
                SELECT
                    COUNT(*) as total_formats,
                    COUNT(*) FILTER (WHERE is_active = true) as active_formats,
                    COUNT(*) FILTER (WHERE is_template = true) as template_formats,
                    SUM(usage_count) as total_usage,
                    AVG(success_rate) as avg_success_rate,
                    COUNT(DISTINCT category) as unique_categories,
                    COUNT(DISTINCT recommended_ai_model) as unique_models
                FROM image_formats
            """)

            result = db_session.execute(stats_query)
            row = result.fetchone()

            return {
                "success": True,
                "stats": {
                    "total_formats": row.total_formats,
                    "active_formats": row.active_formats,
                    "template_formats": row.template_formats,
                    "total_usage": row.total_usage,
                    "avg_success_rate": float(row.avg_success_rate) if row.avg_success_rate else 0.0,
                    "unique_categories": row.unique_categories,
                    "unique_models": row.unique_models
                }
            }

        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas de formatos de imágenes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@image_formats_router.get("/stats/most-used")
async def get_most_used_image_formats(limit: int = 10):
    """
    Obtiene los formatos de imágenes más utilizados.

    **Parámetros:**
    - limit: Número de resultados (default: 10)
    """
    try:
        db_session = get_database_session()
        try:
            query = text("""
                SELECT
                    id, format_name, category, usage_count, success_rate
                FROM image_formats
                WHERE is_active = true
                ORDER BY usage_count DESC
                LIMIT :limit
            """)

            result = db_session.execute(query, {"limit": limit})
            rows = result.fetchall()

            formats = []
            for row in rows:
                formats.append({
                    "id": row.id,
                    "format_name": row.format_name,
                    "category": row.category,
                    "usage_count": row.usage_count,
                    "success_rate": float(row.success_rate) if row.success_rate else 0.0
                })

            return {
                "success": True,
                "formats": formats
            }

        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error obteniendo formatos más utilizados: {e}")
        raise HTTPException(status_code=500, detail=str(e))
