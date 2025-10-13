"""
Tarea de Celery optimizada SOLO para almacenamiento local.

Elimina completamente Google File API y usa archivos locales directamente.
Implementa validación robusta de imágenes y manejo de errores optimizado.
"""
import time
import base64
import requests
import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
from celery import current_task
from celery.utils.log import get_task_logger

from celery_app import celery_app
from models.database import VideoOperation, get_database_session
from utils.config import get_settings
from services.circuit_breaker import veo_circuit_breaker
from auth.google_genai_auth import google_genai_auth
from services.google_api_logger import google_api_logger

logger = get_task_logger(__name__)

def log_api_call(operation_id: str, url: str, headers: Dict[str, str], payload: Dict[str, Any],
                response: requests.Response = None, error: Exception = None):
    """
    Log completo de llamadas API para debugging.
    Guarda todos los detalles de request/response en logs estructurados.
    """
    timestamp = datetime.now().isoformat()
    log_data = {
        "timestamp": timestamp,
        "operation_id": operation_id,
        "api_call": {
            "url": url,
            "method": "POST",
            "headers": {k: v if k != "x-goog-api-key" else f"***{v[-4:]}" for k, v in headers.items()},
            "payload_size_bytes": len(json.dumps(payload)),
            "payload_structure": {
                "instances_count": len(payload.get("instances", [])),
                "prompt_length": len(payload.get("instances", [{}])[0].get("prompt", "")),
                "has_image": "image" in payload.get("instances", [{}])[0],
                "image_size_bytes": len(payload.get("instances", [{}])[0].get("image", {}).get("bytesBase64Encoded", "")),
                "parameters": payload.get("parameters", {})
            }
        }
    }

    # Log request
    logger.info(f"🔍 API CALL DEBUG - Request:")
    logger.info(f"   Operation ID: {operation_id}")
    logger.info(f"   URL: {url}")
    logger.info(f"   Timestamp: {timestamp}")
    logger.info(f"   Payload size: {log_data['api_call']['payload_size_bytes']} bytes")
    logger.info(f"   Prompt length: {log_data['api_call']['payload_structure']['prompt_length']} chars")
    logger.info(f"   Image size: {log_data['api_call']['payload_structure']['image_size_bytes']} chars (base64)")
    logger.info(f"   Parameters: {json.dumps(log_data['api_call']['payload_structure']['parameters'])}")

    # Log response
    if response is not None:
        log_data["response"] = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "content_length": len(response.text),
            "response_preview": response.text[:500] + "..." if len(response.text) > 500 else response.text
        }

        logger.info(f"📥 API CALL DEBUG - Response:")
        logger.info(f"   Status Code: {response.status_code}")
        logger.info(f"   Response Length: {len(response.text)} chars")
        logger.info(f"   Response Preview: {response.text[:200]}...")

        try:
            response_json = response.json()
            logger.info(f"   Response Structure: {list(response_json.keys())}")
            if "error" in response_json:
                logger.error(f"   API Error: {response_json['error']}")
        except:
            logger.warning(f"   Response not JSON format")

    # Log error
    if error is not None:
        log_data["error"] = {
            "type": type(error).__name__,
            "message": str(error)
        }
        logger.error(f"💥 API CALL DEBUG - Error:")
        logger.error(f"   Error Type: {type(error).__name__}")
        logger.error(f"   Error Message: {str(error)}")

    # Save to log file for detailed analysis
    try:
        settings = get_settings()
        log_dir = Path(settings.UPLOAD_DIR) / "api_logs"
        log_dir.mkdir(exist_ok=True, parents=True)

        log_file = log_dir / f"api_call_{operation_id}_{timestamp.replace(':', '-')}.json"
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        logger.info(f"💾 API call logged to: {log_file}")
    except Exception as e:
        logger.warning(f"⚠️ Could not save API log to file: {e}")

@celery_app.task(bind=True)
def generate_text_to_video_task_local(
    self,
    operation_id: str,
    prompt: str,
    aspect_ratio: str = "16:9",
    veo_model: str = "veo-3.0-generate-preview",
    negative_prompt: Optional[str] = None
):
    """Generación de video desde texto usando modelo seleccionable"""
    # Para texto-a-video, usar imagen vacía/transparente
    # Crear imagen 1x1 transparente como placeholder
    transparent_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8nSgAAAABJRU5ErkJggg=="

    return generate_image_to_video_task_local_only.s(
        operation_id,
        prompt,
        transparent_image,
        "image/png",
        aspect_ratio,
        "720p",
        veo_model,
        negative_prompt
    ).apply_async()

@celery_app.task(bind=True)
def generate_image_to_video_task_local(
    self,
    operation_id: str,
    prompt: str,
    image_data: bytes,  # Bytes de imagen
    content_type: str,
    aspect_ratio: str = "16:9",
    resolution: str = "720p",
    veo_model: str = "veo-3.0-generate-preview",
    negative_prompt: Optional[str] = None
):
    """Wrapper para compatibilidad - convierte bytes a base64"""
    import base64

    # Convertir bytes a base64
    image_base64 = base64.b64encode(image_data).decode('utf-8')

    return generate_image_to_video_task_local_only.s(
        operation_id,
        prompt,
        image_base64,
        content_type,
        aspect_ratio,
        resolution,
        veo_model,
        negative_prompt
    ).apply_async()

@celery_app.task(bind=True, max_retries=3)
def generate_image_to_video_task_local_only(
    self,
    operation_id: str,
    prompt: str,
    image_data: str,  # Base64 string
    content_type: str = None,
    aspect_ratio: str = "16:9",
    resolution: str = "1080p",
    veo_model: str = "veo-3.0-generate-preview",
    scene_index: Optional[int] = None,
    negative_prompt: Optional[str] = None
):
    """
    Generación de video SOLO con almacenamiento local

    FLUJO SIMPLIFICADO:
    ==================
    1. Frontend → Base64 → API Backend
    2. Guardar imagen localmente
    3. Leer imagen → bytes limpios
    4. Enviar bytes directamente a Veo API (sin File API)
    5. Descargar video → guardar localmente
    6. Servir desde endpoint local
    """
    session = get_database_session()

    try:
        # Actualizar estado a processing
        operation = session.query(VideoOperation).filter(VideoOperation.id == operation_id).first()
        if not operation:
            raise Exception(f"Operación {operation_id} no encontrada")

        operation.status = "processing"
        session.commit()

        logger.info(f"🎬 Generación LOCAL ONLY: {operation_id} | Escena: {scene_index}")
        settings = get_settings()

        # Crear directorios si no existen
        upload_dir = Path(settings.UPLOAD_DIR)
        images_dir = upload_dir / "banana" / "video"
        videos_dir = upload_dir / "videos" / "clip"

        for directory in [upload_dir, images_dir, videos_dir]:
            directory.mkdir(exist_ok=True, parents=True)

        # PASO 1: Procesar y guardar imagen localmente
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 20, 'total': 100, 'status': 'Procesando imagen...'}
        )

        # DEBUG: Loggear datos de entrada
        logger.info(f"🔍 DEBUG - Datos recibidos:")
        logger.info(f"   - image_data type: {type(image_data)}")
        logger.info(f"   - image_data length: {len(str(image_data))}")
        logger.info(f"   - image_data preview (first 100 chars): {str(image_data)[:100]}")
        logger.info(f"   - content_type: {content_type}")

        # Limpiar base64 y detectar tipo
        clean_base64, mime_type = _clean_base64(image_data)
        image_bytes = base64.b64decode(clean_base64)

        # Generar nombre único
        image_filename = f"image_{operation_id}.png"
        image_path = images_dir / image_filename

        # Guardar imagen
        with open(image_path, 'wb') as f:
            f.write(image_bytes)

        logger.info(f"💾 Imagen guardada: {image_path}")

        # PASO 2: Preparar prompt
        full_prompt = prompt
        if negative_prompt:
            full_prompt += f"\nNegative prompt: {negative_prompt}"

        current_task.update_state(
            state='PROGRESS',
            meta={'current': 40, 'total': 100, 'status': 'Preparando solicitud Veo...'}
        )

        # PASO 3: Leer imagen y enviar directamente a Veo API
        # Convertir bytes a base64 limpio para API
        image_base64_clean = base64.b64encode(image_bytes).decode('utf-8')

        # Payload directo sin File API
        payload = {
            "instances": [
                {
                    "prompt": full_prompt,
                    "image": {
                        "bytesBase64Encoded": image_base64_clean,
                        "mimeType": content_type
                    }
                }
            ],
            "parameters": {
                "aspectRatio": aspect_ratio
            }
        }

        # Agregar parámetros opcionales
        if negative_prompt:
            payload["parameters"]["negativePrompt"] = negative_prompt

        # PASO 4: Llamar a Veo API directamente
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Enviando a Veo API...'}
        )

        headers = {
            "x-goog-api-key": settings.GOOGLE_API_KEY,
            "Content-Type": "application/json"
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{veo_model}:predictLongRunning"

        logger.info(f"📡 Enviando directamente a Veo API (método local)")
        logger.info(f"📊 Imagen: {len(image_bytes)} bytes, guardada en: {image_path}")

        # Iniciar logging completo de Google API call
        call_id = google_api_logger.start_api_call(
            api_type="veo",
            endpoint=url,
            request_body=payload,
            operation_id=operation_id,
            method="POST",
            request_headers=headers
        )

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)

            if response.status_code != 200:
                error_msg = f"Error en Veo API: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")

                # Registrar fallo en Google API logger
                google_api_logger.fail_api_call(
                    call_id=call_id,
                    error_message=error_msg,
                    response_status_code=response.status_code,
                    response_body=response.text
                )

                # Retry con backoff exponencial para errores 503, 502, 429
                if response.status_code in [503, 502, 429]:
                    retry_countdown = min(60 * (2 ** self.request.retries), 600)  # Max 10 minutos
                    logger.warning(f"⏳ Reintentando en {retry_countdown}s debido a error {response.status_code}")
                    raise self.retry(exc=Exception(error_msg), countdown=retry_countdown)

                raise Exception(error_msg)

            # Registrar éxito en Google API logger
            response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            google_api_logger.complete_api_call(
                call_id=call_id,
                response_status_code=response.status_code,
                response_body=response_data,
                response_headers=dict(response.headers)
            )

        except requests.exceptions.RequestException as e:
            error_msg = f"Error de conexión con Veo API: {str(e)}"
            google_api_logger.fail_api_call(
                call_id=call_id,
                error_message=error_msg
            )
            raise Exception(error_msg)
        except Exception as e:
            google_api_logger.fail_api_call(
                call_id=call_id,
                error_message=str(e)
            )
            raise

        result = response.json()
        operation_name = result.get("name")

        if not operation_name:
            raise Exception("No se recibió nombre de operación de Google")

        logger.info(f"✅ Operación Veo iniciada: {operation_name}")

        # PASO 5: Polling para esperar video
        poll_count = 0
        max_polls = 120  # 10 minutos máximo (aumentado de 72 para Google Veo)
        operation_done = False

        while not operation_done and poll_count < max_polls:
            time.sleep(5)
            poll_count += 1

            # Actualizar progreso
            progress = min(50 + (poll_count * 30 // max_polls), 85)
            current_task.update_state(
                state='PROGRESS',
                meta={'current': progress, 'total': 100, 'status': f'Generando video... {poll_count}/{max_polls}'}
            )

            try:
                check_url = f"https://generativelanguage.googleapis.com/v1beta/{operation_name}"
                check_headers = {"x-goog-api-key": settings.GOOGLE_API_KEY}

                # Log polling call
                poll_call_id = google_api_logger.start_api_call(
                    api_type="veo",
                    endpoint=check_url,
                    request_body={},
                    operation_id=operation_id,
                    method="GET",
                    request_headers=check_headers
                )

                check_response = requests.get(check_url, headers=check_headers)

                if check_response.status_code == 200:
                    check_data = check_response.json()

                    # Log successful polling response
                    google_api_logger.complete_api_call(
                        call_id=poll_call_id,
                        response_status_code=check_response.status_code,
                        response_body=check_data,
                        response_headers=dict(check_response.headers)
                    )

                    operation_done = check_data.get("done", False)

                    if operation_done:
                        if "error" in check_data:
                            error_msg = check_data["error"].get("message", "Error desconocido")
                            raise Exception(f"Error en Veo API: {error_msg}")

                        # Video completado
                        response_data = check_data.get("response", {})
                        generate_video_response = response_data.get("generateVideoResponse", {})
                        generated_samples = generate_video_response.get("generatedSamples", [])

                        if not generated_samples:
                            raise Exception("No se recibieron samples del video generado")

                        video_uri = generated_samples[0].get("video", {}).get("uri")

                        if not video_uri:
                            raise Exception("No se recibió URI del video generado")

                        logger.info(f"🎥 Video generado: {video_uri}")

                        # PASO 6: Descargar y guardar video localmente
                        current_task.update_state(
                            state='PROGRESS',
                            meta={'current': 90, 'total': 100, 'status': 'Descargando video...'}
                        )

                        # Descargar video con headers de autorización
                        download_headers = {
                            "x-goog-api-key": settings.GOOGLE_API_KEY
                        }

                        # Log descarga de video
                        download_call_id = google_api_logger.start_api_call(
                            api_type="veo",
                            endpoint=video_uri,
                            request_body={},
                            operation_id=operation_id,
                            method="GET",
                            request_headers=download_headers
                        )

                        video_response = requests.get(video_uri, headers=download_headers, stream=True, timeout=300)
                        video_response.raise_for_status()

                        # Log successful download
                        google_api_logger.complete_api_call(
                            call_id=download_call_id,
                            response_status_code=video_response.status_code,
                            response_body={"downloaded": True, "content_length": video_response.headers.get('content-length', 'unknown')},
                            response_headers=dict(video_response.headers)
                        )

                        # Guardar video con índice de escena si está disponible
                        if scene_index is not None:
                            video_filename = f"clip_{operation_id}_scene_{scene_index}.mp4"
                        else:
                            video_filename = f"clip_{operation_id}.mp4"
                        video_path = videos_dir / video_filename

                        with open(video_path, 'wb') as f:
                            for chunk in video_response.iter_content(chunk_size=8192):
                                f.write(chunk)

                        # Generar URL local
                        local_video_url = f"http://localhost:8001/api/v1/uploads/videos/clip/{video_filename}"

                        # Actualizar operación en BD
                        operation.status = "completed"
                        operation.video_url = local_video_url
                        operation.filename = f"videos/clip/{video_filename}"
                        operation.local_path = str(video_path)
                        operation.google_video_uri = video_uri
                        operation.completed_at = datetime.now(timezone.utc)
                        session.commit()

                        logger.info(f"✅ Video guardado: {video_path}")
                        logger.info(f"🌐 URL local: {local_video_url}")

                        return {
                            'status': 'completed',
                            'video_url': local_video_url,
                            'local_path': str(video_path),
                            'google_uri': video_uri,
                            'operation_id': operation_id,
                            'method': 'local_only'
                        }

            except requests.RequestException as e:
                logger.warning(f"Error en polling (intento {poll_count}): {e}")
                # Log error en polling si hay una variable poll_call_id disponible
                if 'poll_call_id' in locals():
                    google_api_logger.fail_api_call(
                        call_id=poll_call_id,
                        error_message=f"Error en polling intento {poll_count}: {str(e)}"
                    )
                continue

        # Timeout
        raise Exception(f"Timeout: Video no completado después de {max_polls} intentos")

    except Exception as e:
        logger.error(f"❌ Error en generación local: {e}")

        # Actualizar estado de error
        if 'operation' in locals():
            operation.status = "error"
            operation.error_message = str(e)
            session.commit()

        raise e
    finally:
        session.close()

def _clean_base64(image_data: str) -> tuple[str, str]:
    """
    Limpia datos base64, detecta MIME type y valida imagen.

    Args:
        image_data: String con datos base64 (con o sin prefijos)

    Returns:
        tuple: (clean_base64_string, mime_type)

    Raises:
        Exception: Si la imagen es inválida o el base64 está corrupto
    """
    import re
    import base64
    from PIL import Image
    import io

    # DEBUG: Loggear proceso de limpieza
    logger.info("🧹 DEBUG _clean_base64 - Entrada:")
    logger.info(f"   - type: {type(image_data)}")
    logger.info(f"   - length: {len(str(image_data))}")
    logger.info(f"   - starts_with: {str(image_data)[:50]}")

    # Detectar patrón data:mime/type;base64,
    data_url_pattern = r'^data:([^;]+);base64,(.+)$'
    match = re.match(data_url_pattern, image_data)

    if match:
        mime_type = match.group(1)
        clean_base64 = match.group(2)
    else:
        # Remover prefijo base64, si existe
        if image_data.startswith('base64,'):
            clean_base64 = image_data[7:]
        else:
            clean_base64 = image_data
        mime_type = 'image/png'  # Default

    # Remover whitespace
    clean_base64 = ''.join(clean_base64.split())

    # Agregar padding si es necesario
    missing_padding = len(clean_base64) % 4
    if missing_padding:
        clean_base64 += '=' * (4 - missing_padding)

    # VALIDAR IMAGEN
    try:
        # Decodificar base64 a bytes
        image_bytes = base64.b64decode(clean_base64)

        # Verificar tamaño mínimo de archivo
        if len(image_bytes) < 100:  # Reducido temporalmente para debug
            raise Exception(f"Imagen demasiado pequeña: {len(image_bytes)} bytes. Mínimo 100 bytes")

        # Verificar tamaño máximo
        image_size_mb = len(image_bytes) / (1024 * 1024)
        if image_size_mb > 20:
            raise Exception(f"Imagen demasiado grande: {image_size_mb:.2f} MB. Máximo 20MB")

        # Validar que es una imagen válida y verificar dimensiones
        image_stream = io.BytesIO(image_bytes)
        with Image.open(image_stream) as img:
            width, height = img.size

            # Verificar dimensiones mínimas para Google Veo
            if width < 64 or height < 64:
                raise Exception(f"Imagen demasiado pequeña: {width}x{height}. Mínimo 64x64 pixels")
            if width > 4096 or height > 4096:
                raise Exception(f"Imagen demasiado grande: {width}x{height}. Máximo 4096x4096 pixels")

            # Validar formato
            if img.format not in ['JPEG', 'PNG', 'WEBP']:
                raise Exception(f"Formato no soportado: {img.format}. Use JPEG, PNG o WEBP")

            # Actualizar MIME type basado en formato real
            if img.format == 'JPEG':
                mime_type = 'image/jpeg'
            elif img.format == 'PNG':
                mime_type = 'image/png'
            elif img.format == 'WEBP':
                mime_type = 'image/webp'

            logger.info(f"✅ Imagen válida: {img.format} {width}x{height}, {image_size_mb:.2f}MB")

    except base64.binascii.Error as e:
        raise Exception(f"Base64 inválido: {str(e)}")
    except Exception as e:
        if "cannot identify image file" in str(e):
            raise Exception("Imagen corrupta o formato no válido")
        raise Exception(f"Error validando imagen: {str(e)}")

    return clean_base64, mime_type
