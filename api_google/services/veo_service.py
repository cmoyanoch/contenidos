"""
Servicio para generar videos con Google GenAI SDK oficial
"""
import asyncio
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

from models.database import VideoOperation, get_database_session
from models.schemas import VideoStatusResponse
from tasks.video_tasks_local_only import generate_text_to_video_task_local, generate_image_to_video_task_local
from utils.config import get_settings
from utils.logger import setup_logger
# Removido: auth.google_genai_auth (solo usamos Gemini API directamente)
from services.circuit_breaker import veo_circuit_breaker, CircuitState
from services.quota_service import quota_service

import redis

logger = setup_logger(__name__)

class VeoService:
    """Servicio para generar videos con Gemini API (HTTP directo)"""

    def __init__(self):
        self.settings = get_settings()
        self.redis_client = redis.from_url(self.settings.REDIS_URL)

    def get_genai_info(self) -> Dict[str, Any]:
        """Retorna información sobre el estado de Gemini API"""
        return {
            "authenticated": bool(self.settings.GOOGLE_API_KEY),
            "api_type": "Gemini API (HTTP directo)",
            "endpoint": "generativelanguage.googleapis.com"
        }

    async def generate_text_to_video(
        self,
        operation_id: str,
        prompt: str,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        veo_model: str = "veo-3.0-generate-preview",
        negative_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Genera un video desde texto usando Gemini API"""
        try:
            # Verificar API key
            if not self.settings.GOOGLE_API_KEY:
                raise Exception("Google API Key no está configurada")

            # Verificar circuit breaker
            if veo_circuit_breaker.state.value != "closed":
                raise Exception("Servicio de Veo temporalmente no disponible")

            # Verificar cuota
            if not quota_service.check_quota("text_to_video"):
                raise Exception("Cuota de generación excedida")

            # Crear operación en base de datos
            session = get_database_session()
            try:
                operation = VideoOperation(
                    id=operation_id,
                    prompt=prompt,
                    status="queued",
                    type="text_to_video"
                )
                session.add(operation)
                session.commit()
                logger.info(f"✅ Operación creada: {operation_id}")
            finally:
                session.close()

            # Enviar tarea a Celery
            task = generate_text_to_video_task_local.delay(
                operation_id=operation_id,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                veo_model=veo_model,
                negative_prompt=negative_prompt
            )

            logger.info(f"🎬 Tarea de generación enviada: {task.id}")

            return {
                "operation_id": operation_id,
                "task_id": task.id,
                "status": "queued"
            }

        except Exception as e:
            logger.error(f"❌ Error en generación texto-a-video: {e}")
            raise e

    async def generate_image_to_video(
        self,
        operation_id: str,
        prompt: str,
        image_url: str,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        veo_model: str = "veo-3.0-generate-preview",
        negative_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Genera un video desde imagen URL usando Google GenAI"""
        try:
            # Verificar autenticación
            if not self.settings.GOOGLE_API_KEY:
                raise Exception("Google API Key no está configurada")

            # Verificar circuit breaker
            if veo_circuit_breaker.state.value != "closed":
                raise Exception("Servicio de Veo temporalmente no disponible")

            # Verificar cuota
            if not quota_service.check_quota("image_to_video"):
                raise Exception("Cuota de generación excedida")

            # Descargar imagen desde URL
            import requests
            try:
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()
                image_content = response.content
                content_type = response.headers.get('content-type', 'image/jpeg')
            except Exception as e:
                raise Exception(f"Error descargando imagen desde {image_url}: {str(e)}")

            # Crear operación en base de datos
            session = get_database_session()
            try:
                operation = VideoOperation(
                    id=operation_id,
                    prompt=prompt,
                    status="queued",
                    type="image_to_video"
                )
                session.add(operation)
                session.commit()
                logger.info(f"✅ Operación creada: {operation_id}")
            finally:
                session.close()

            # Enviar tarea a Celery
            task = generate_image_to_video_task_local.delay(
                operation_id=operation_id,
                prompt=prompt,
                image_data=image_content,  # bytes
                content_type=content_type,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                veo_model=veo_model,
                negative_prompt=negative_prompt
            )

            logger.info(f"🎬 Tarea de generación enviada: {task.id}")

            return {
                "operation_id": operation_id,
                "task_id": task.id,
                "status": "queued"
            }

        except Exception as e:
            logger.error(f"❌ Error en generación imagen-a-video: {e}")
            raise e

    async def generate_image_to_video_base64(
        self,
        operation_id: str,
        prompt: str,
        image_content: bytes,
        content_type: str,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        veo_model: str = "veo-3.0-generate-preview",
        negative_prompt: Optional[str] = None
    ) -> None:
        """Genera video desde imagen en Base64"""
        try:
            logger.info(f"🎬 Iniciando generación imagen-a-video-base64: {operation_id}")

            # Check circuit breaker state
            if veo_circuit_breaker.state == CircuitState.OPEN:
                raise Exception("Servicio de Veo temporalmente no disponible")

            # Create operation in database
            session = get_database_session()
            try:
                operation = VideoOperation(
                    id=operation_id,
                    prompt=prompt,
                    aspect_ratio=aspect_ratio,
                    negative_prompt=negative_prompt,
                    status="queued",
                    created_at=datetime.utcnow()
                )
                session.add(operation)
                session.commit()
                logger.info(f"✅ Operación creada en BD: {operation_id}")
            finally:
                session.close()

            # Send task to Celery
            task = generate_image_to_video_task_local.delay(
                operation_id=operation_id,
                prompt=prompt,
                image_content=image_content,
                content_type=content_type,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                veo_model=veo_model,
                negative_prompt=negative_prompt
            )
            logger.info(f"🚀 Tarea Celery enviada: {task.id}")
        except Exception as e:
            logger.error(f"❌ Error en generación imagen-a-video-base64: {e}")
            raise e

    async def generate_image_to_video_base64_json(
        self,
        operation_id: str,
        prompt: str,
        image_data: str,
        content_type: Optional[str] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        veo_model: str = "veo-3.0-generate-preview",
        scene_index: Optional[int] = None,
        negative_prompt: Optional[str] = None
    ) -> None:
        """Genera video desde imagen base64 enviada como JSON"""
        try:
            logger.info(f"🎬 Iniciando generación imagen-a-video-base64-json: {operation_id} | Escena: {scene_index}")

            # Verificar autenticación
            if not self.settings.GOOGLE_API_KEY:
                raise Exception("Google API Key no está configurada")

            # Verificar circuit breaker
            if veo_circuit_breaker.state == CircuitState.OPEN:
                raise Exception("Servicio de Veo temporalmente no disponible")

            # Verificar cuota
            if not quota_service.check_quota("image_to_video"):
                raise Exception("Cuota de generación excedida")

            # Crear operación en base de datos
            session = get_database_session()
            try:
                operation = VideoOperation(
                    id=operation_id,
                    prompt=prompt,
                    aspect_ratio=aspect_ratio,
                    negative_prompt=negative_prompt,
                    status="queued",
                    type="image_to_video_base64_json",
                    created_at=datetime.utcnow()
                )
                session.add(operation)
                session.commit()
                logger.info(f"✅ Operación creada en BD: {operation_id}")
            finally:
                session.close()

            # Enviar tarea a Celery SOLO LOCAL (sin Google File API)
            from tasks.video_tasks_local_only import generate_image_to_video_task_local_only
            task = generate_image_to_video_task_local_only.delay(
                operation_id=operation_id,
                prompt=prompt,
                image_data=image_data,  # String base64 (con o sin prefijos)
                content_type=content_type,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                veo_model=veo_model,
                scene_index=scene_index,
                negative_prompt=negative_prompt
            )
            logger.info(f"🚀 Tarea Celery enviada: {task.id}")
        except Exception as e:
            logger.error(f"❌ Error en generación imagen-a-video-base64-json: {e}")
            raise e

    async def get_operation_status(self, operation_id: str) -> VideoStatusResponse:
        """Obtiene el estado de una operación"""
        try:
            session = get_database_session()
            try:
                operation = session.query(VideoOperation).filter(VideoOperation.id == operation_id).first()

                if not operation:
                    raise ValueError(f"Operación {operation_id} no encontrada")

                # Convertir datetime a timestamp
                created_at_timestamp = operation.created_at.timestamp() if operation.created_at else 0.0
                completed_at_timestamp = operation.completed_at.timestamp() if operation.completed_at else None
                failed_at_timestamp = operation.failed_at.timestamp() if operation.failed_at else None

                logger.info(f"🔍 DEBUG - error_message: {operation.error_message}")
                return VideoStatusResponse(
                    operation_id=operation_id,
                    status=operation.status,
                    prompt=operation.prompt,
                    type=operation.type or "text_to_video",
                    created_at=created_at_timestamp,
                    completed_at=completed_at_timestamp,
                    failed_at=failed_at_timestamp,
                    error_message=operation.error_message,
                    video_url=operation.video_url,
                    filename=operation.filename
                )
            finally:
                session.close()

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"❌ Error obteniendo estado: {e}")
            raise e

    async def get_download_info(self, operation_id: str) -> Dict[str, Any]:
        """Obtiene información para descargar un video"""
        try:
            session = get_database_session()
            try:
                operation = session.query(VideoOperation).filter(VideoOperation.id == operation_id).first()

                if not operation:
                    raise ValueError(f"Operación {operation_id} no encontrada")

                if operation.status != "completed":
                    raise ValueError(f"Operación {operation_id} no está completada")

                if not operation.video_url:
                    raise ValueError(f"Operación {operation_id} no tiene video URL")

                return {
                    "operation_id": operation_id,
                    "video_url": operation.video_url,
                    "filename": operation.filename,
                    "status": operation.status,
                    "download_url": f"/api/v1/download/{operation_id}"
                }
            finally:
                session.close()

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"❌ Error obteniendo información de descarga: {e}")
            raise e

    async def get_video_operation(self, operation_id: str) -> Optional[VideoOperation]:
        """Obtiene una operación de video por ID"""
        try:
            session = get_database_session()
            try:
                operation = session.query(VideoOperation).filter(VideoOperation.id == operation_id).first()
                return operation
            finally:
                session.close()

        except Exception as e:
            logger.error(f"❌ Error obteniendo operación: {e}")
            return None

    async def generate_image_from_base64(
        self,
        prompt: str,
        image_data: str,
        content_type: str = "image/jpeg",
        aspect_ratio_image: Optional[str] = None
    ) -> Dict[str, Any]:
        """Genera una imagen modificada usando Google GenAI Gemini"""
        try:
            # Verificar autenticación
            if not self.settings.GOOGLE_API_KEY:
                raise Exception("Google API Key no está configurada")

            # Obtener cliente autenticado
            # Cliente HTTP directo (requests) - ver tasks/video_tasks_local_only.py

            # Limpiar el base64 (remover prefijos si existen)
            original_image_data = image_data
            if ',' in image_data:
                image_data = image_data.split(',')[1]

            # Validar base64
            import base64
            from PIL import Image
            import io
            try:
                decoded_data = base64.b64decode(image_data)
                logger.info(f"📏 Tamaño imagen decodificada: {len(decoded_data)} bytes")

                # Validar que es una imagen válida usando PIL
                image_stream = io.BytesIO(decoded_data)
                with Image.open(image_stream) as img:
                    logger.info(f"🖼️ Imagen válida: {img.format} {img.size} {img.mode}")

                    # Verificar dimensiones mínimas/máximas
                    width, height = img.size
                    if width < 64 or height < 64:
                        raise Exception(f"Imagen demasiado pequeña: {width}x{height}. Mínimo 64x64")
                    if width > 4096 or height > 4096:
                        raise Exception(f"Imagen demasiado grande: {width}x{height}. Máximo 4096x4096")

                    # Verificar que no sea transparente completamente
                    if img.mode == 'RGBA':
                        alpha_channel = img.split()[-1]
                        if not any(alpha_channel.getdata()):
                            raise Exception("Imagen completamente transparente no soportada")

            except Exception as e:
                if "cannot identify image file" in str(e):
                    logger.error(f"❌ Imagen corrupta o formato no válido: {e}")
                    raise Exception("Imagen corrupta o formato no soportado")
                logger.error(f"❌ Error validando imagen: {e}")
                raise Exception(f"Error de imagen: {str(e)}")

            # Validar tamaño de imagen (Google Veo limits)
            image_size_mb = len(decoded_data) / (1024 * 1024)
            logger.info(f"📐 Tamaño imagen: {image_size_mb:.2f} MB")

            if image_size_mb < 0.01:  # Muy pequeña
                raise Exception(f"Imagen demasiado pequeña ({image_size_mb:.2f} MB). Mínimo 0.01 MB")
            if image_size_mb > 20:    # Muy grande
                raise Exception(f"Imagen demasiado grande ({image_size_mb:.2f} MB). Máximo 20 MB")

            # Validar content-type
            valid_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if content_type not in valid_types:
                logger.warning(f"⚠️ Content-type '{content_type}' no está en la lista válida. Usando 'image/jpeg'")
                content_type = 'image/jpeg'

            # Configurar el modelo para generación de imágenes
            model_name = "gemini-2.5-flash-image"

            # Crear el prompt con aspect ratio si se proporciona
            final_prompt = prompt
            if aspect_ratio_image:
                final_prompt = f"{prompt}. Aspect ratio: {aspect_ratio_image}"

            # Crear el contenido para la API (formato correcto según REST API)
            contents = [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": final_prompt
                        },
                        {
                            "inlineData": {
                                "mimeType": content_type,
                                "data": image_data
                            }
                        }
                    ]
                }
            ]

            # Log información de la request
            logger.info(f"🎨 Llamando a Google GenAI:")
            logger.info(f"   - Modelo: {model_name}")
            logger.info(f"   - Content-type: {content_type}")
            logger.info(f"   - Prompt length: {len(final_prompt)} chars")
            logger.info(f"   - Base64 length: {len(image_data)} chars")
            logger.info(f"   - Aspect ratio: {aspect_ratio_image}")

            # Log del body completo (truncado para legibilidad)
            import json
            request_body = {
                "model": model_name,
                "contents": contents
            }
            logger.info(f"📋 BODY REQUEST COMPLETO:")
            logger.info(f"   Model: {request_body['model']}")
            contents_structure = {
                'role': contents[0]['role'],
                'parts_count': len(contents[0]['parts']),
                'text_length': len(contents[0]['parts'][0]['text']),
                'inlineData_mimeType': contents[0]['parts'][1]['inlineData']['mimeType'],
                'inlineData_data_length': len(contents[0]['parts'][1]['inlineData']['data'])
            }
            logger.info(f"   Contents structure: {json.dumps(contents_structure, indent=2)}")

            # Log primeros 100 chars del prompt y base64
            logger.info(f"📝 Prompt preview: '{final_prompt[:100]}{'...' if len(final_prompt) > 100 else ''}'")
            logger.info(f"🔢 Base64 preview: '{image_data[:50]}{'...' if len(image_data) > 50 else ''}'")
            logger.info(f"🔢 Base64 ends with: '...{image_data[-20:]}'")

            # Llamar a la API de Google GenAI
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents
                )
                logger.info(f"✅ Respuesta recibida de Google GenAI")
            except Exception as api_error:
                logger.error(f"❌ Error en API Google GenAI: {str(api_error)}")
                logger.error(f"   - Tipo de error: {type(api_error).__name__}")
                # Re-lanzar el error original para debugging
                raise api_error

            # Procesar la respuesta
            generated_images = []
            if response.candidates and response.candidates[0]:
                parts = response.candidates[0].content.parts

                for part_index, part in enumerate(parts):
                    if hasattr(part, 'inlineData') and part.inlineData:
                        base64_data = part.inlineData.data
                        mime_type = part.inlineData.mimeType or 'image/png'
                        data_url = f"data:{mime_type};base64,{base64_data}"

                        generated_images.append({
                            "index": part_index,
                            "base64": data_url,
                            "mimeType": mime_type,
                            "size": len(base64_data)
                        })

            return {
                "success": True,
                "message": "Imagen generada con Gemini",
                "generatedImages": generated_images,
                "totalGenerated": len(generated_images),
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"❌ Error en generación de imagen: {e}")
            raise e
