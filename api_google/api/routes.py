"""
Rutas de la API para generación de videos - MIGRADO A GOOGLE GENAI
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional
import uuid
import os
import requests
import base64
import re
from pathlib import Path

from services.veo_service import VeoService
from models.database import VideoOperation, get_database_session
from services.quota_service import quota_service
from models.schemas import (
    VideoGenerationRequest,
    VideoGenerationResponse,
    ImageToVideoRequest,
    ImageToVideoBase64Request,
    ImageGenerationRequest,
    ImageGenerationResponse,
    BatchImageAnalysisRequest,
    BatchImageAnalysisResponse,
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    VideoAnalysisRequest,
    VideoAnalysisResponse,
    ContinuityGenerationRequest,
    ContinuityGenerationResponse
)

from api.rate_limiting_routes import router as rate_limiting_router # noqa: F401
from utils.logger import setup_logger
from utils.config import get_settings
from services.context_cache_service import context_cache_service
from auth.google_genai_auth import google_genai_auth
from services.circuit_breaker import veo_circuit_breaker
from services.batch_service import batch_service
from services.robust_analysis_service import robust_analysis_service
from services.google_api_logger import google_api_logger

logger = setup_logger(__name__)

# Routers
health_router = APIRouter()
video_router = APIRouter()

# Servicio de Veo con Google GenAI
veo_service = VeoService()

@health_router.get("/")
async def health_check():
    """Endpoint de salud de la API"""
    return {
        "status": "healthy",
        "service": "Veo 3.0 Video Generation API (Google GenAI)",
        "version": "2.0.0",
        "google_genai_auth": google_genai_auth.is_authenticated(),
        "circuit_breaker": {
            "state": veo_circuit_breaker.state,
            "failure_count": veo_circuit_breaker.failure_count,
            "last_failure_time": veo_circuit_breaker.last_failure_time,
            "is_available": veo_circuit_breaker.state.value == "closed"
        },
        "genai_info": veo_service.get_genai_info()
    }

@video_router.post("/generate/text-to-video", response_model=VideoGenerationResponse)
async def generate_text_to_video(request: VideoGenerationRequest):
    """Genera un video a partir de texto usando Google GenAI"""
    try:
        operation_id = str(uuid.uuid4())
        logger.info(f"🎬 Solicitud de generación texto-a-video: {operation_id}")

        await veo_service.generate_text_to_video(
            operation_id=operation_id,
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            veo_model=request.veo_model,
            negative_prompt=request.negative_prompt
        )

        return VideoGenerationResponse(
            operation_id=operation_id,
            status="queued",
            message="Video en cola de generación"
        )

    except Exception as e:
        logger.error(f"❌ Error en generación texto-a-video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.post("/generate/image-to-video", response_model=VideoGenerationResponse)
async def generate_image_to_video(request: ImageToVideoRequest):
    """Genera un video a partir de imagen usando Google GenAI"""
    try:
        operation_id = str(uuid.uuid4())
        logger.info(f"🎬 Solicitud de generación imagen-a-video: {operation_id}")

        await veo_service.generate_image_to_video(
            operation_id=operation_id,
            prompt=request.prompt,
            image_url=request.image_url,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            veo_model=request.veo_model,
            negative_prompt=request.negative_prompt
        )

        return VideoGenerationResponse(
            operation_id=operation_id,
            status="queued",
            message="Video en cola de generación"
        )

    except Exception as e:
        logger.error(f"❌ Error en generación imagen-a-video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.post("/generate/image-to-video-base64", response_model=VideoGenerationResponse)
async def generate_image_to_video_base64(
    prompt: str = Form(...),
    file: UploadFile = File(...),
    aspect_ratio: str = Form("16:9"),
    resolution: str = Form("720p"),
    veo_model: str = Form("veo-3.0-generate-preview"),
    negative_prompt: Optional[str] = Form(None)
):
    """
    Genera un video a partir de una imagen en Base64 usando Google GenAI
    """
    try:
        operation_id = str(uuid.uuid4())
        logger.info(f" Solicitud de generación imagen-a-video-base64: {operation_id}")

        # Validar tipo de archivo
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        # Leer contenido del archivo
        image_content = await file.read()

        # Llamar al servicio
        await veo_service.generate_image_to_video_base64(
            operation_id=operation_id,
            prompt=prompt,
            image_content=image_content,
            content_type=file.content_type,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            veo_model=veo_model,
            negative_prompt=negative_prompt
        )

        return VideoGenerationResponse(
            operation_id=operation_id,
            status="queued",
            message="Generación de video iniciada"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en endpoint imagen-a-video-base64: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.post("/generate/image-to-video-base64-json", response_model=VideoGenerationResponse)
async def generate_image_to_video_base64_json(request: ImageToVideoBase64Request):
    """
    Genera un video a partir de una imagen en Base64 enviada como JSON
    Acepta base64 con o sin prefijos (data:, base64,)
    """
    try:
        operation_id = str(uuid.uuid4())
        logger.info(f"🎬 Solicitud de generación imagen-a-video-base64-json: {operation_id} | Escena: {request.scene_index}")

        # Llamar al servicio con los datos base64 directamente
        await veo_service.generate_image_to_video_base64_json(
            operation_id=operation_id,
            prompt=request.prompt,
            image_data=request.image_base64,
            content_type=request.content_type,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            veo_model=request.veo_model,
            scene_index=request.scene_index,
            negative_prompt=request.negative_prompt
        )

        return VideoGenerationResponse(
            operation_id=operation_id,
            status="queued",
            message=f"Generación de video desde base64 JSON iniciada - Escena {request.scene_index}",
            scene_index=request.scene_index
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en endpoint imagen-a-video-base64-json: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/status/{operation_id}")
async def get_video_status(operation_id: str):
    """Obtiene el estado de una operación de generación de video"""
    try:
        status = await veo_service.get_operation_status(operation_id)
        return status
    except Exception as e:
        logger.error(f"❌ Error obteniendo estado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/download/{operation_id}")
async def download_video(operation_id: str):
    """Descarga un video generado"""
    try:
        # Obtener información de la operación
        operation = await veo_service.get_video_operation(operation_id)

        if not operation:
            raise HTTPException(status_code=404, detail="Operación no encontrada")

        if operation.status != "completed":
            raise HTTPException(status_code=400, detail="Video no está listo para descarga")

        if not operation.filename:
            raise HTTPException(status_code=404, detail="Archivo de video no encontrado")

        # Construir ruta del archivo
        file_path = f"/app/uploads/{operation.filename}"

        # Verificar que el archivo existe
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo de video no encontrado en el sistema")

        # Devolver el archivo
        return FileResponse(
            path=file_path,
            filename=operation.filename,
            media_type="video/mp4"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error descargando video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === ENDPOINTS PARA SERVIR ARCHIVOS LOCALES ===

@video_router.get("/uploads/videos/clip/{filename}")
async def serve_clip_video(filename: str):
    """Sirve videos desde el directorio uploads/videos/clip/"""
    try:
        file_path = Path("uploads") / "videos" / "clip" / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")

        return FileResponse(
            path=str(file_path),
            media_type="video/mp4",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo video clip: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/uploads/videos/post/{filename}")
async def serve_post_video(filename: str):
    """Sirve videos concatenados desde el directorio uploads/videos/post/"""
    try:
        file_path = Path("uploads") / "videos" / "post" / filename

        if not file_path.exists():
            logger.error(f"❌ Video no encontrado: {file_path}")
            raise HTTPException(status_code=404, detail=f"Video not found: {filename}")

        logger.info(f"✅ Sirviendo video post: {filename}")
        return FileResponse(
            path=str(file_path),
            media_type="video/mp4",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error sirviendo video post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/uploads/banana/video/{filename}")
async def serve_banana_image(filename: str):
    """Sirve imágenes desde el directorio uploads/banana/video/"""
    try:
        file_path = Path("uploads") / "banana" / "video" / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")

        return FileResponse(
            path=str(file_path),
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo imagen banana: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/uploads/banana/format/{filename}")
async def serve_format_image(filename: str):
    """Sirve imágenes desde el directorio uploads/banana/format/"""
    try:
        file_path = Path("uploads") / "banana" / "format" / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Format image not found")

        # Detectar MIME type por extensión
        mime_types = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp"
        }

        file_extension = file_path.suffix.lower()
        media_type = mime_types.get(file_extension, "image/png")

        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo imagen format: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/quota")
async def get_quota_info():
    """Obtiene información sobre cuotas y límites"""
    try:
        quota_info = await quota_service.get_quota_info()
        return quota_info
    except Exception as e:
        logger.error(f"❌ Error obteniendo información de cuota: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/test-static")
async def test_static():
    """Endpoint de prueba para archivos estáticos"""
    return {"message": "Test static endpoint working", "working_directory": str(Path.cwd())}

# === ENDPOINTS PARA CONTENIDO GENERADO DEL PLANIFICADOR ===

@video_router.get("/uploads/content_generated/videos/persona_realista/{filename}")
async def serve_person_realistic_video(filename: str):
    """Sirve videos de persona realista generados por el planificador"""
    try:
        file_path = Path("uploads/content_generated/videos/persona_realista") / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")

        return FileResponse(
            path=str(file_path),
            media_type="video/mp4",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo video persona realista: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/uploads/content_generated/videos/avatar_animado/{filename}")
async def serve_avatar_animated_video(filename: str):
    """Sirve videos de avatar animado generados por el planificador"""
    try:
        file_path = Path("uploads/content_generated/videos/avatar_animado") / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")

        return FileResponse(
            path=str(file_path),
            media_type="video/mp4",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo video avatar animado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/uploads/content_generated/images/estadisticas/{filename}")
async def serve_stats_image(filename: str):
    """Sirve imágenes de estadísticas generadas por el planificador"""
    try:
        file_path = Path("uploads/content_generated/images/estadisticas") / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")

        return FileResponse(
            path=str(file_path),
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo imagen estadísticas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/uploads/content_generated/images/manual_content/{filename}")
async def serve_manual_content_image(filename: str):
    """Sirve imágenes de contenido manual generadas por el planificador"""
    try:
        file_path = Path("uploads/content_generated/images/manual_content") / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")

        return FileResponse(
            path=str(file_path),
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo imagen contenido manual: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/uploads/content_generated/posts/cta_posts/{filename}")
async def serve_cta_post(filename: str):
    """Sirve posts CTA generados por el planificador"""
    try:
        file_path = Path("uploads/content_generated/posts/cta_posts") / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Post not found")

        return FileResponse(
            path=str(file_path),
            media_type="text/plain",
            headers={
                "Cache-Control": "public, max-age=7200",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"❌ Error sirviendo post CTA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === FUNCIÓN HELPER: PROCESAMIENTO MULTI-FORMATO DE IMÁGENES ===

def process_image_input(image_input: str, mime_type: Optional[str] = None) -> tuple[str, str]:
    """
    Procesa entrada de imagen en múltiples formatos y retorna (base64_puro, mime_type)

    Soporta:
    1. Base64 puro: "/9j/4AAQSkZJRg..."
    2. Data URL: "data:image/jpeg;base64,/9j/4AAQ..."
    3. Ruta local: "/uploads/banana/format/formato.png"
    4. URL remota: "http://example.com/image.jpg"

    Args:
        image_input: String con cualquiera de los formatos soportados
        mime_type: MIME type opcional (auto-detectado si no se proporciona)

    Returns:
        tuple[str, str]: (base64_puro, mime_type)

    Raises:
        HTTPException: Si el formato no es válido o el archivo/URL no existe
    """

    # CASO 1: Data URL (data:image/...;base64,...)
    if image_input.startswith("data:"):
        logger.info("🔍 Detectado: Data URL con prefijo")

        # Extraer MIME type del data URL si no se proporcionó
        if not mime_type and ";" in image_input:
            mime_part = image_input.split(";")[0].replace("data:", "")
            detected_mime = mime_part if mime_part.startswith("image/") else None
            if detected_mime:
                mime_type = detected_mime
                logger.info(f"✅ MIME type extraído del Data URL: {mime_type}")

        # Extraer base64
        if ";base64," in image_input:
            clean_base64 = image_input.split(";base64,", 1)[1]
        elif "," in image_input:
            clean_base64 = image_input.split(",", 1)[1]
        else:
            raise HTTPException(status_code=400, detail="Data URL inválido, falta separador ','")

        if not mime_type:
            mime_type = "image/jpeg"

        logger.info(f"✅ Data URL procesado: {len(clean_base64)} chars")
        return clean_base64, mime_type

    # CASO 2: Prefijo base64, (base64,...)
    elif image_input.startswith("base64,"):
        logger.info("🔍 Detectado: Prefijo base64,")
        clean_base64 = image_input[7:]
        mime_type = mime_type or "image/jpeg"
        logger.info(f"✅ Prefijo removido: {len(clean_base64)} chars")
        return clean_base64, mime_type

    # CASO 3: Ruta Local (/uploads/... o ./uploads/...)
    elif (image_input.startswith("/uploads/") or
      image_input.startswith("./uploads/") or
      image_input.startswith("uploads/")):

        logger.info(f"🔍 Detectado: Ruta local - {image_input}")

        # Convertir a Path absoluto dentro del contenedor Docker
        # En Docker: /uploads/... → /app/uploads/...
        # Fuera de Docker: /uploads/... → uploads/... (relativo al directorio actual)
        if image_input.startswith("/uploads/"):
            # Ruta absoluta en contenedor Docker
            file_path = Path(f"/app{image_input}")
            logger.info(f"🐳 Ruta Docker detectada: {file_path}")
        elif image_input.startswith("./"):
            # Ruta relativa
            file_path = Path(image_input[2:])
        else:
            # Ruta absoluta genérica
            file_path = Path(image_input)

        # Validar existencia
        if not file_path.exists():
            logger.error(f"❌ Archivo no encontrado: {file_path}")
            raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {image_input}")

        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"La ruta no es un archivo: {image_input}")

        # Leer y convertir a base64
        try:
            with open(file_path, "rb") as f:
                image_bytes = f.read()
            clean_base64 = base64.b64encode(image_bytes).decode('utf-8')
            logger.info(f"✅ Archivo leído: {len(image_bytes)} bytes → {len(clean_base64)} chars base64")
        except Exception as e:
            logger.error(f"❌ Error leyendo archivo: {e}")
            raise HTTPException(status_code=500, detail=f"Error leyendo archivo: {str(e)}")

        # Auto-detectar MIME type
        if not mime_type:
            ext = file_path.suffix.lower()
            mime_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp"
            }
            mime_type = mime_map.get(ext, "image/jpeg")
            logger.info(f"🔍 MIME type auto-detectado: {mime_type} (extensión: {ext})")

        return clean_base64, mime_type

    # CASO 3.5: URL Local (localhost o 127.0.0.1) - NUEVO
    elif (image_input.startswith("http://localhost:") or
      image_input.startswith("http://127.0.0.1:") or
      image_input.startswith("https://localhost:") or
      image_input.startswith("https://127.0.0.1:")):

       logger.info(f"🔍 Detectado: URL local (localhost) - Convirtiendo a path")

      # Convertir URL local a path de archivo
      # http://localhost:8001/api/v1/uploads/banana/format/formato.png
      # → /app/uploads/banana/format/formato.png

      # Extraer path después de /uploads/
       if "/api/v1/uploads/" in image_input:
        relative_path = image_input.split("/api/v1/uploads/", 1)[1]
        file_path = Path(f"/app/uploads/{relative_path}")
       elif "/uploads/" in image_input:
        relative_path = image_input.split("/uploads/", 1)[1]
        file_path = Path(f"/app/uploads/{relative_path}")
       else:
        raise HTTPException(
            status_code=400,
            detail=f"URL local no contiene /uploads/: {image_input}"
        )

       logger.info(f"🐳 URL local convertida a path: {file_path}")

       # Validar existencia
       if not file_path.exists():
        logger.error(f"❌ Archivo no encontrado: {file_path}")
        raise HTTPException(
            status_code=404,
            detail=f"Archivo no encontrado en path convertido: {file_path}"
        )

       # Leer y convertir a base64
       with open(file_path, "rb") as f:
        image_bytes = f.read()
       clean_base64 = base64.b64encode(image_bytes).decode('utf-8')

       # Auto-detectar MIME
       if not mime_type:
        ext = file_path.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp"
        }
        mime_type = mime_map.get(ext, "image/jpeg")

       logger.info(f"✅ URL local procesada: {len(clean_base64)} chars base64")
       return clean_base64, mime_type

    # CASO 4: URL Remota (http:// o https://)
    elif image_input.startswith("http://") or image_input.startswith("https://"):

        logger.info(f"🔍 Detectado: URL remota - {image_input}")

        try:
            response = requests.get(image_input, timeout=10)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error descargando imagen: HTTP {response.status_code}"
                )

            image_bytes = response.content
            clean_base64 = base64.b64encode(image_bytes).decode('utf-8')
            logger.info(f"✅ Imagen descargada: {len(image_bytes)} bytes → {len(clean_base64)} chars base64")

            # Auto-detectar MIME type
            if not mime_type:
                content_type = response.headers.get('Content-Type', '')
                if content_type.startswith('image/'):
                    mime_type = content_type.split(';')[0]
                    logger.info(f"🔍 MIME type desde header: {mime_type}")
                else:
                    from urllib.parse import urlparse
                    parsed = urlparse(image_input)
                    ext = Path(parsed.path).suffix.lower()
                    mime_map = {
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".png": "image/png",
                        ".gif": "image/gif",
                        ".webp": "image/webp"
                    }
                    mime_type = mime_map.get(ext, "image/jpeg")
                    logger.info(f"🔍 MIME type desde extensión URL: {mime_type}")

            return clean_base64, mime_type

        except requests.RequestException as e:
            logger.error(f"❌ Error descargando URL: {e}")
            raise HTTPException(status_code=400, detail=f"Error descargando imagen desde URL: {str(e)}")

    # CASO 5: Base64 Puro (sin prefijos)
    else:
        logger.info("🔍 Detectado: Base64 puro (sin prefijos)")

        # Validar que es base64 válido
        try:
            # Limpiar espacios, saltos de línea y caracteres inválidos
            clean_base64 = image_input.strip().replace("\n", "").replace("\r", "").replace(" ", "")

            # Agregar padding si es necesario
            # Base64 debe tener longitud múltiplo de 4
            padding_needed = (4 - len(clean_base64) % 4) % 4
            if padding_needed:
                clean_base64 += "=" * padding_needed
                logger.info(f"🔧 Padding agregado: {padding_needed} caracteres")

            # Test decodificación completa para validar
            decoded = base64.b64decode(clean_base64)

            # Validar que la imagen decodificada tiene contenido
            if len(decoded) < 100:
                raise ValueError(f"Imagen decodificada demasiado pequeña: {len(decoded)} bytes")

            mime_type = mime_type or "image/jpeg"
            logger.info(f"✅ Base64 puro validado y limpiado: {len(clean_base64)} chars, {len(decoded)} bytes decodificados")
            return clean_base64, mime_type

        except Exception as e:
            logger.error(f"❌ Input no reconocido - ni Data URL, ni path válido, ni base64: {str(e)}")
            logger.error(f"❌ Input recibido (primeros 200 chars): {image_input[:200]}")
            raise HTTPException(
                status_code=400,
                detail=f"Formato de imagen no reconocido. Debe ser: Data URL, path local (/uploads/...), URL (http://...), o base64 puro válido"
            )

# === ENDPOINT: GENERACIÓN DE IMAGEN ===

@video_router.post("/generate-image", response_model=ImageGenerationResponse)
async def generate_image_with_gemini(request: ImageGenerationRequest):
    """
    Genera/modifica una imagen usando Google Gemini 2.5 Flash Image (Stable)
    Soporta composición de hasta 2 imágenes + texto de alta fidelidad

    CAPACIDADES:
    - Text-to-Image: Generar desde cero con solo prompt
    - Image + Text: Modificar/editar imágenes existentes (ej: agregar logo)
    - Multi-Image: Combinar hasta 2 imágenes (ej: logo + imagen base)
    - Renderizado de texto: Generar texto legible en imágenes (logotipos, diagramas)

    ASPECT RATIOS soportados:
    - 16:9 (1344x768) - YouTube, presentaciones, banners
    - 9:16 (768x1344) - Instagram Stories, TikTok, Reels
    - 1:1 (1024x1024) - Instagram Feed, Facebook
    - 4:5 (896x1152) - Instagram vertical
    - 21:9 (1536x672) - Banners ultra-wide

    Formatos soportados para imageDataUrl e imageDataUrl2:
    1. Base64 puro
    2. Data URL (data:image/...;base64,...)
    3. Ruta local (/uploads/...)
    4. URL remota (http://... o https://...)

    """
    try:
        logger.info(f"🎨 Solicitud de generación de imagen con prompt: {request.imagePrompt[:50]}...")
        settings = get_settings()

        # Preparar prompt mejorado según estilo de personaje
        character_style = request.character_style or "realistic"
        enhanced_prompt = request.imagePrompt
        logger.info(f"📸 Estilo realista (photographic)")

        # Construir las partes del contenido (parts)
        parts = [
            {
                "text": enhanced_prompt
            }
        ]

        # ==========================================
        # PROCESAR PRIMERA IMAGEN (OPCIONAL)
        # ==========================================
        if request.imageDataUrl and request.imageDataUrl.strip() != "":
            logger.info(f"📸 Procesando primera imagen de referencia...")
            clean_base64, mime_type = process_image_input(request.imageDataUrl, request.mimeType)

            parts.append({
                "inlineData": {
                    "mimeType": mime_type,
                    "data": clean_base64
                }
            })
            logger.info(f"✅ Imagen de referencia procesada")
        else:
            logger.info(f"🎨 Generación desde cero (sin imagen de referencia)")

        # ==========================================
        # PROCESAR SEGUNDA IMAGEN (OPCIONAL)
        # ==========================================
        if (request.imageDataUrl2 and
            request.imageDataUrl2.strip() != "" and
            request.imageDataUrl2.strip() != "null" and
            request.imageDataUrl2.strip() != "undefined"):

            logger.info(f"🖼️ Procesando segunda imagen...")
            try:
                clean_base64_2, mime_type_2 = process_image_input(request.imageDataUrl2, request.mimeType2)

                parts.append({
                    "inlineData": {
                        "mimeType": mime_type_2,
                        "data": clean_base64_2
                    }
                })
                logger.info(f"✅ Composición de 2 imágenes preparada")
            except Exception as e:
                logger.warning(f"⚠️ Error procesando segunda imagen, continuando con una sola: {e}")
                # Continuar con solo la primera imagen si la segunda falla
        else:
            logger.info(f"🎨 Solo una imagen o generación desde cero (imageDataUrl2 no válido o vacío)")

        # Payload para Gemini API
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts  # 🆕 Ahora puede tener 2 o 3 elementos (prompt + 1-2 imágenes)
                }
            ],
            "generationConfig": {
                "temperature": request.temperature or 0.7,
                "maxOutputTokens": request.maxOutputTokens or 2048
            }
        }

        # Agregar configuración de aspect ratio si se proporciona
        if request.aspect_ratio:
            payload["generationConfig"]["imageConfig"] = {
                "aspectRatio": request.aspect_ratio
            }
            logger.info(f"📐 Aspect ratio configurado: {request.aspect_ratio}")

        # Headers para la API de Google
        headers = {
            "x-goog-api-key": settings.GOOGLE_API_KEY,
            "Content-Type": "application/json"
        }

        # URL de la API de Gemini 2.5 Flash Image (Stable)
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent"

        logger.info(f"📡 Enviando solicitud a Gemini 2.5 Flash Image (Stable)")

        # Realizar llamada a la API
        response = requests.post(url, headers=headers, json=payload, timeout=30)

        if response.status_code != 200:
            logger.error(f"❌ Error en Gemini API: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail=f"Error en Gemini API: {response.status_code}")

        result = response.json()
        logger.info(f"�� Respuesta completa de Gemini: {result}")

        return ImageGenerationResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en generación de imagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.post("/debug-images")
async def debug_images(request: ImageGenerationRequest):
    """Debug endpoint para verificar qué imágenes están llegando"""
    try:
        import hashlib

        # Procesar primera imagen
        clean_base64, mime_type = process_image_input(request.imageDataUrl, request.mimeType)
        hash1 = hashlib.md5(clean_base64.encode()).hexdigest()[:8]

        result = {
            "image1": {
                "source": "imageDataUrl",
                "mime_type": mime_type,
                "size_bytes": len(clean_base64),
                "hash": hash1,
                "is_data_url": request.imageDataUrl.startswith("data:") if isinstance(request.imageDataUrl, str) else False,
                "is_path": request.imageDataUrl.startswith("/") if isinstance(request.imageDataUrl, str) else False,
                "preview": str(request.imageDataUrl)[:100] if isinstance(request.imageDataUrl, str) else "base64 data"
            }
        }

        # Procesar segunda imagen si existe
        if request.imageDataUrl2:
            clean_base64_2, mime_type_2 = process_image_input(request.imageDataUrl2, request.mimeType2)
            hash2 = hashlib.md5(clean_base64_2.encode()).hexdigest()[:8]

            result["image2"] = {
                "source": "imageDataUrl2",
                "mime_type": mime_type_2,
                "size_bytes": len(clean_base64_2),
                "hash": hash2,
                "is_data_url": request.imageDataUrl2.startswith("data:") if isinstance(request.imageDataUrl2, str) else False,
                "is_path": request.imageDataUrl2.startswith("/") if isinstance(request.imageDataUrl2, str) else False,
                "preview": str(request.imageDataUrl2)[:100] if isinstance(request.imageDataUrl2, str) else "base64 data"
            }

            result["images_are_identical"] = hash1 == hash2

        result["prompt_length"] = len(request.imagePrompt)
        result["character_style"] = request.character_style

        return result

    except Exception as e:
        return {"error": str(e)}

@video_router.get("/debug/{operation_id}")
async def debug_operation(operation_id: str):
    """Debug endpoint para verificar datos de la operación"""
    try:
        session = get_database_session()
        try:
            operation = session.query(VideoOperation).filter(VideoOperation.id == operation_id).first()

            if not operation:
                return {"error": f"Operación {operation_id} no encontrada"}

            return {
                "operation_id": operation_id,
                "status": operation.status,
                "error_message": operation.error_message,
                "error_message_type": type(operation.error_message).__name__,
                "error_message_length": len(operation.error_message) if operation.error_message else 0
            }
        finally:
            session.close()
    except Exception as e:
        return {"error": str(e)}

@video_router.post("/batch/analyze-images", response_model=BatchImageAnalysisResponse)
async def batch_analyze_images(request: BatchImageAnalysisRequest):
    """
    Analiza múltiples imágenes en batch usando Gemini API

    Permite analizar hasta 10 imágenes simultáneamente con diferentes prompts.
    Útil para análisis masivo, clasificación de contenido, generación de descripciones, etc.
    """
    try:
        logger.info(f"🔍 Solicitud de análisis batch: {len(request.items)} imágenes")

        # Validaciones
        if not request.items:
            raise HTTPException(status_code=400, detail="No se proporcionaron imágenes para analizar")

        if len(request.items) > 10:
            raise HTTPException(status_code=400, detail="Máximo 10 imágenes por batch")

        # Verificar API key
        if not get_settings().GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="Google API Key no configurada")

        # Procesar batch
        result = await batch_service.process_batch_analysis(request)

        logger.info(f"✅ Batch completado: {result.successful_items}/{result.total_items} exitosos")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en análisis batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === ROBUST ANALYSIS ENDPOINTS ===

@video_router.post("/analyze/image", response_model=ImageAnalysisResponse)
async def analyze_image_robust(request: ImageAnalysisRequest):
    """
    Análisis robusto y detallado de imagen usando Gemini API

    Proporciona análisis completo incluyendo:
    - Composición fotográfica y elementos visuales
    - Paleta de colores y análisis cromático
    - Estilo artístico y técnico
    - Iluminación y calidad técnica
    - Identificación de sujetos y objetos
    - Prompt optimizado para replicación
    """
    try:
        logger.info(f"🔍 Solicitud de análisis robusto de imagen")

        # Validaciones básicas
        if not request.image_base64:
            raise HTTPException(status_code=400, detail="image_base64 es requerido")

        # Verificar API key
        if not get_settings().GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="Google API Key no configurada")

        # Procesar análisis
        result = await robust_analysis_service.analyze_image(request)

        logger.info(f"✅ Análisis de imagen completado: {result.analysis_id}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en análisis robusto de imagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.post("/analyze/video", response_model=VideoAnalysisResponse)
async def analyze_video_robust(request: VideoAnalysisRequest):
    """
    Análisis robusto y detallado de video usando Gemini API
    """
    try:
        logger.info(f"🎬 Solicitud de análisis robusto de video")

        # Validaciones
        if not request.video_base64 and not request.video_url:
            raise HTTPException(status_code=400, detail="Se debe proporcionar video_base64 o video_url")

        # Verificar API key
        if not get_settings().GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="Google API Key no configurada")

        # ANÁLISIS REAL CON GEMINI API
        logger.info(f"🧠 Iniciando análisis real con Gemini API")
        result = await robust_analysis_service.analyze_video(request)

        logger.info(f"✅ Análisis real completado: {result.analysis_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en análisis real: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.post("/analyze/generate-continuity", response_model=ContinuityGenerationResponse)
async def generate_video_continuity(request: ContinuityGenerationRequest):
    """
    Genera continuidad para un video basado en análisis previo

    Permite extender videos existentes generando nuevos clips que continúen
    desde el último frame del video original, manteniendo coherencia visual
    y narrativa para crear videos más largos.
    """
    try:
        logger.info(f"🔗 Solicitud de generación de continuidad")

        # Validaciones
        if not request.original_video_analysis_id:
            raise HTTPException(status_code=400, detail="original_video_analysis_id es requerido")

        # Procesar generación de continuidad
        result = await robust_analysis_service.generate_continuity(request)

        logger.info(f"✅ Generación de continuidad completada: {result.generation_id}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en generación de continuidad: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === GOOGLE API LOGS ENDPOINTS ===

@video_router.get("/logs/google-api/{operation_id}")
async def get_google_api_logs_by_operation(operation_id: str):
    """
    Obtiene todos los logs de Google API calls para una operación específica

    Muestra todas las llamadas realizadas a Google APIs (Veo, Gemini)
    para una operación de video, incluyendo request/response completos.
    """
    try:
        logs = google_api_logger.get_api_call_logs(operation_id=operation_id)

        if not logs:
            raise HTTPException(status_code=404, detail=f"No se encontraron logs para operation_id: {operation_id}")

        return {
            "operation_id": operation_id,
            "total_calls": len(logs),
            "logs": logs
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo logs para operation_id {operation_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/logs/google-api/call/{call_id}")
async def get_google_api_call_by_id(call_id: str):
    """
    Obtiene el log completo de una Google API call específica por su ID

    Devuelve todos los detalles de una llamada específica incluyendo
    request body, response body, headers, timing y errores.
    """
    try:
        log_data = google_api_logger.get_api_call_by_id(call_id)

        if not log_data:
            raise HTTPException(status_code=404, detail=f"No se encontró log para call_id: {call_id}")

        return log_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo log para call_id {call_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/logs/google-api")
async def get_google_api_logs(
    api_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    """
    Obtiene logs de Google API calls con filtros opcionales

    Parámetros:
    - api_type: Filtrar por tipo de API ('veo', 'gemini')
    - status: Filtrar por status ('success', 'error', 'timeout')
    - limit: Límite de resultados (máximo 100)
    """
    try:
        if limit > 100:
            limit = 100

        logs = google_api_logger.get_api_call_logs(
            api_type=api_type,
            status=status,
            limit=limit
        )

        return {
            "total_returned": len(logs),
            "filters": {
                "api_type": api_type,
                "status": status,
                "limit": limit
            },
            "logs": logs
        }

    except Exception as e:
        logger.error(f"❌ Error obteniendo logs de Google API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/logs/google-api/stats")
async def get_google_api_stats():
    """
    Obtiene estadísticas de uso de Google APIs

    Devuelve contadores y métricas sobre las llamadas realizadas
    a las diferentes APIs de Google.
    """
    try:
        # Obtener logs recientes para calcular stats
        all_logs = google_api_logger.get_api_call_logs(limit=1000)

        stats = {
            "total_calls": len(all_logs),
            "by_api_type": {},
            "by_status": {},
            "recent_errors": []
        }

        for log in all_logs:
            # Contar por tipo de API
            api_type = log.get('api_type', 'unknown')
            if api_type not in stats["by_api_type"]:
                stats["by_api_type"][api_type] = 0
            stats["by_api_type"][api_type] += 1

            # Contar por status
            status = log.get('status', 'unknown')
            if status not in stats["by_status"]:
                stats["by_status"][status] = 0
            stats["by_status"][status] += 1

            # Recopilar errores recientes
            if status == 'error' and len(stats["recent_errors"]) < 10:
                stats["recent_errors"].append({
                    "call_id": log.get('id'),
                    "operation_id": log.get('operation_id'),
                    "api_type": log.get('api_type'),
                    "error_message": log.get('error_message'),
                    "timestamp": log.get('request_timestamp')
                })

        return stats

    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas de Google API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === ADVANCED CAPABILITIES ENDPOINTS ===

@video_router.post("/analyze/image/object-detection", response_model=ImageAnalysisResponse)
async def analyze_image_object_detection(request: ImageAnalysisRequest):
    """
    Análisis de imagen con detección de objetos usando Gemini 2.0+

    Capacidades avanzadas:
    - Detección y localización de objetos
    - Clasificación por categorías
    - Coordenadas de bounding boxes
    - Relaciones espaciales entre objetos
    - Análisis de confianza
    """
    try:
        logger.info(f"🔍 Solicitud de análisis con detección de objetos")

        # Validaciones básicas
        if not request.image_base64:
            raise HTTPException(status_code=400, detail="image_base64 es requerido")

        # Verificar API key
        if not get_settings().GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="Google API Key no configurada")

        # Procesar análisis con detección de objetos
        result = await robust_analysis_service.analyze_image_with_object_detection(request)

        logger.info(f"✅ Análisis con detección de objetos completado: {result.analysis_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en análisis con detección de objetos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.post("/analyze/image/segmentation", response_model=ImageAnalysisResponse)
async def analyze_image_segmentation(request: ImageAnalysisRequest):
    """
    Análisis de imagen con segmentación usando Gemini 2.5+

    Capacidades avanzadas:
    - Segmentación de regiones y objetos
    - Máscaras de segmentación
    - Clasificación de segmentos
    - Relaciones entre segmentos
    - Análisis de confianza
    """
    try:
        logger.info(f"🔍 Solicitud de análisis con segmentación")

        # Validaciones básicas
        if not request.image_base64:
            raise HTTPException(status_code=400, detail="image_base64 es requerido")

        # Verificar API key
        if not get_settings().GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="Google API Key no configurada")

        # Procesar análisis con segmentación
        result = await robust_analysis_service.analyze_image_with_segmentation(request)

        logger.info(f"✅ Análisis con segmentación completado: {result.analysis_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en análisis con segmentación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@video_router.post("/analyze/image/cached", response_model=ImageAnalysisResponse)
async def analyze_image_cached(request: ImageAnalysisRequest):
    """
    Análisis de imagen con caching inteligente para optimizar costos
    Reutiliza análisis similares y reduce costos de API en 40%
    """
    try:
        logger.info(f"🔍 Solicitud de análisis de imagen con caching")
        if not request.image_base64:
            raise HTTPException(status_code=400, detail="image_base64 es requerido")
        if not get_settings().GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="Google API Key no configurada")

        result = await robust_analysis_service.analyze_image_with_caching(request)
        logger.info(f"✅ Análisis con caching completado: {result.analysis_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en análisis con caching: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.get("/cache/stats")
async def get_cache_stats():
    """
    Obtener estadísticas del cache de contexto
    """
    try:
        stats = await context_cache_service.get_cache_stats()
        return {
            "cache_stats": stats,
            "message": "Estadísticas del cache obtenidas exitosamente"
        }
    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas del cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@video_router.delete("/cache/clear")
async def clear_cache(analysis_type: Optional[str] = None):
    """
    Limpiar cache de contexto
    """
    try:
        deleted_count = await context_cache_service.clear_cache(analysis_type)
        return {
            "deleted_entries": deleted_count,
            "analysis_type": analysis_type or "all",
            "message": f"Cache limpiado: {deleted_count} entradas eliminadas"
        }
    except Exception as e:
        logger.error(f"❌ Error limpiando cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# ENDPOINTS DE CAPTURA Y REPLICACIÓN DE FORMATOS
# =====================================================

@video_router.post("/formats/capture")
async def capture_video_format(
    format_name: str = Form(...),
    video_file: UploadFile = File(None),
    video_url: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: str = Form("general"),
    tags: Optional[str] = Form(None),  # Comma-separated
    use_case: Optional[str] = Form(None),
    is_template: bool = Form(False),
):
    """
    Captura un formato de video analizándolo y guardando toda la información
    necesaria para replicarlo posteriormente.

    **Parámetros:**
    - format_name: Nombre único del formato
    - video_file: Archivo de video (o usar video_url)
    - video_url: URL del video (o usar video_file)
    - description: Descripción del formato
    - category: Categoría (promotional, educational, entertainment, etc.)
    - tags: Tags separados por comas
    - use_case: Caso de uso específico
    - is_template: Si es una plantilla predefinida
    """
    try:
        from services.format_capture_service import FormatCaptureService

        logger.info(f"📹 Solicitud de captura de formato: {format_name}")

        # Validar que se proporcione video
        if not video_file and not video_url:
            raise HTTPException(status_code=400, detail="Debe proporcionar video_file o video_url")

        # Preparar video_data
        video_data = None
        if video_file:
            video_bytes = await video_file.read()
            video_base64 = base64.b64encode(video_bytes).decode("utf-8")
            video_data = f"data:video/mp4;base64,{video_base64}"
        else:
            video_data = video_url

        # Parsear tags
        tags_list = []
        if tags:
            tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

        # Crear servicio
        db_session = get_database_session()
        try:
            format_service = FormatCaptureService(db_session)

            # Capturar formato
            result = await format_service.capture_video_format(
                format_name=format_name,
                video_data=video_data,
                description=description,
                category=category,
                tags=tags_list,
                use_case=use_case,
                is_template=is_template,
            )

            logger.info(f"✅ Formato capturado: {format_name} (ID: {result['format_id']})")
            return result
        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error capturando formato: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@video_router.get("/formats/list")
async def list_video_formats(
    category: Optional[str] = None,
    tags: Optional[str] = None,  # Comma-separated
    is_template: Optional[bool] = None,
    limit: int = 50,
):
    """
    Lista formatos de video disponibles con filtros opcionales.

    **Parámetros:**
    - category: Filtrar por categoría
    - tags: Filtrar por tags (separados por comas)
    - is_template: Filtrar por plantillas predefinidas
    - limit: Número máximo de resultados
    """
    try:
        from services.format_capture_service import FormatCaptureService

        logger.info(f"📋 Listando formatos (category={category}, tags={tags})")

        # Parsear tags
        tags_list = None
        if tags:
            tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

        # Crear servicio
        db_session = get_database_session()
        try:
            format_service = FormatCaptureService(db_session)

            # Listar formatos
            formats = format_service.list_formats(
                category=category,
                tags=tags_list,
                is_template=is_template,
                limit=limit,
            )

            logger.info(f"✅ Encontrados {len(formats)} formatos")
            return {
                "formats": formats,
                "count": len(formats),
            }
        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error listando formatos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@video_router.get("/formats/{format_id}")
async def get_video_format(format_id: int):
    """
    Obtiene los detalles completos de un formato de video.

    **Parámetros:**
    - format_id: ID del formato
    """
    try:
        from services.format_capture_service import FormatCaptureService
        from sqlalchemy import text

        logger.info(f"🔍 Obteniendo formato ID: {format_id}")

        db_session = get_database_session()
        try:
            query = text("SELECT * FROM video_formats WHERE id = :id AND is_active = true")
            result = db_session.execute(query, {"id": format_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Formato {format_id} no encontrado")

            format_data = dict(row._mapping)

            logger.info(f"✅ Formato encontrado: {format_data['format_name']}")
            return format_data
        finally:
            db_session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo formato: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@video_router.delete("/formats/{format_id}")
async def delete_video_format(format_id: int):
    """
    Elimina un formato de video (soft delete).

    **Parámetros:**
    - format_id: ID del formato a eliminar
    """
    try:
        from sqlalchemy import text

        logger.info(f"🗑️ Eliminando formato ID: {format_id}")

        db_session = get_database_session()
        try:
            # Verificar que el formato existe
            check_query = text("SELECT id, format_name FROM video_formats WHERE id = :id")
            result = db_session.execute(check_query, {"id": format_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Formato {format_id} no encontrado")

            format_name = row.format_name

            # Soft delete: marcar como inactivo
            delete_query = text("UPDATE video_formats SET is_active = false, updated_at = NOW() WHERE id = :id")
            db_session.execute(delete_query, {"id": format_id})
            db_session.commit()

            logger.info(f"✅ Formato eliminado: {format_name}")
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
        logger.error(f"❌ Error eliminando formato: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@video_router.post("/formats/{format_id}/replicate")
async def replicate_video_format(
    format_id: int,
    custom_prompt_additions: Optional[str] = None,
    override_duration: Optional[int] = None,
    theme_name: Optional[str] = None,
):
    """
    Obtiene la configuración necesaria para replicar un formato de video.

    **Parámetros:**
    - format_id: ID del formato a replicar
    - custom_prompt_additions: Adiciones personalizadas al prompt
    - override_duration: Sobreescribir duración recomendada
    - theme_name: Nombre de la temática a incluir en el prompt
    """
    try:
        from services.format_capture_service import FormatCaptureService

        logger.info(f"🎬 Replicando formato ID: {format_id}")

        # Crear servicio
        db_session = get_database_session()
        try:
            format_service = FormatCaptureService(db_session)

            # Preparar adiciones personalizadas con tema
            final_additions = custom_prompt_additions or ""
            if theme_name:
                final_additions = f"Theme: {theme_name}. {final_additions}".strip()

            # Obtener configuración de replicación
            config = format_service.replicate_format(
                format_id=format_id,
                custom_prompt_additions=final_additions if final_additions else None,
                override_duration=override_duration,
            )

            logger.info(f"✅ Configuración de replicación generada para: {config['format_name']}")
            return config
        finally:
            db_session.close()

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error replicando formato: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@video_router.post("/formats/{format_id}/generate")
async def generate_from_format(
    format_id: int,
    theme_name: Optional[str] = None,
    custom_prompt_additions: Optional[str] = None,
    override_duration: Optional[int] = None,
    image_file: UploadFile = File(None),
):
    """
    Genera un video replicando un formato capturado.

    **Parámetros:**
    - format_id: ID del formato a replicar
    - theme_name: Nombre de la temática
    - custom_prompt_additions: Adiciones personalizadas al prompt
    - override_duration: Sobreescribir duración recomendada
    - image_file: Imagen base (opcional, para image-to-video)
    """
    try:
        from services.format_capture_service import FormatCaptureService

        logger.info(f"🎥 Generando video desde formato ID: {format_id}")

        # Obtener configuración de replicación
        db_session = get_database_session()
        try:
            format_service = FormatCaptureService(db_session)

            # Preparar adiciones personalizadas
            final_additions = custom_prompt_additions or ""
            if theme_name:
                final_additions = f"Theme: {theme_name}. {final_additions}".strip()

            config = format_service.replicate_format(
                format_id=format_id,
                custom_prompt_additions=final_additions if final_additions else None,
                override_duration=override_duration,
            )
        finally:
            db_session.close()

        generation_config = config["generation_config"]

        # Generar video
        operation_id = str(uuid.uuid4())

        if image_file:
            # Image-to-video
            image_bytes = await image_file.read()
            image_base64 = base64.b64encode(image_bytes).decode("utf-8")

            request = ImageToVideoBase64Request(
                prompt=generation_config["prompt"],
                image_base64=f"data:image/jpeg;base64,{image_base64}",
                aspect_ratio=generation_config["aspect_ratio"],
                resolution=generation_config["resolution"],
                veo_model=generation_config["veo_model"],
                negative_prompt=generation_config.get("negative_prompt"),
            )

            result = await veo_service.generate_image_to_video_base64(request, operation_id)
        else:
            # Text-to-video
            request = VideoGenerationRequest(
                prompt=generation_config["prompt"],
                aspect_ratio=generation_config["aspect_ratio"],
                resolution=generation_config["resolution"],
                veo_model=generation_config["veo_model"],
                negative_prompt=generation_config.get("negative_prompt"),
            )

            result = await veo_service.generate_video(request, operation_id)

        logger.info(f"✅ Video generado desde formato: {config['format_name']} (Operation: {operation_id})")

        return {
            "operation_id": operation_id,
            "format_name": config["format_name"],
            "format_id": format_id,
            "generation_config": generation_config,
            "message": f"Video en generación usando formato '{config['format_name']}'",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generando desde formato: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@video_router.post("/formats/{format_id}/success")
async def update_format_success(format_id: int, was_successful: bool):
    """
    Actualiza la tasa de éxito de un formato después de usarlo.

    **Parámetros:**
    - format_id: ID del formato
    - was_successful: Si la generación fue exitosa
    """
    try:
        from services.format_capture_service import FormatCaptureService

        logger.info(f"📊 Actualizando éxito del formato ID: {format_id} (success={was_successful})")

        db_session = get_database_session()
        try:
            format_service = FormatCaptureService(db_session)
            format_service.update_format_success(format_id, was_successful)

            logger.info(f"✅ Tasa de éxito actualizada para formato {format_id}")
            return {"message": "Tasa de éxito actualizada"}
        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"❌ Error actualizando éxito del formato: {e}")
        raise HTTPException(status_code=500, detail=str(e))
