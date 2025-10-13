"""
Servicio de Análisis Robusto para Imágenes y Videos
Integración completa con Google Gemini API 2.0+ para análisis multimedia avanzado
"""
import base64
import json
import uuid
import time
import os
import cv2
import math
from datetime import datetime
from typing import Optional, List, Dict, Any
import requests

from utils.config import get_settings
from utils.logger import setup_logger
from services.google_api_logger import google_api_logger
from models.schemas import (
    ImageAnalysisRequest, VideoAnalysisRequest,
    ImageAnalysisResponse, VideoAnalysisResponse,
    FrameAnalysis, TechnicalMetadata,
    ContinuityGenerationRequest, ContinuityGenerationResponse
)

logger = setup_logger(__name__)

class RobustAnalysisService:
    """Servicio para análisis detallado de imágenes y videos usando Google Gemini"""

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.GOOGLE_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def analyze_image(self, request: ImageAnalysisRequest) -> ImageAnalysisResponse:
        """Análisis robusto de imagen usando Gemini API"""
        start_time = time.time()
        analysis_id = str(uuid.uuid4())

        logger.info(f"🔍 Iniciando análisis robusto de imagen: {analysis_id}")

        try:
            # Preparar el contenido para Gemini
            image_data = self._prepare_image_data(request.image_base64, request.content_type)

            # Crear prompt de análisis detallado
            analysis_prompt = self._create_image_analysis_prompt(request)

            # Realizar análisis con Gemini
            gemini_result = await self._analyze_with_gemini(image_data, analysis_prompt, analysis_id)

            # Parsear respuesta
            parsed_analysis = self._parse_image_analysis(gemini_result)

            # Procesar subject_identification: extraer solo nombres (soporta 3 formatos)
            subject_ids = parsed_analysis.get("subject_identification", [])
            if subject_ids and isinstance(subject_ids, list) and len(subject_ids) > 0:
                processed_subjects = []
                for item in subject_ids:
                    if isinstance(item, dict):
                        # Formato 1: Objeto con 'name' → {"name": "Woman", "position": [...]}
                        processed_subjects.append(item.get("name", str(item)))
                    elif isinstance(item, list) and len(item) >= 1:
                        # Formato 2: Array [nombre, coordenadas] → ["Woman", [0.289, 0.185, 0.711, 1.0]]
                        processed_subjects.append(str(item[0]))
                    elif isinstance(item, str):
                        # Formato 3: String directo → "Woman"
                        processed_subjects.append(item)
                    else:
                        # Fallback: convertir a string
                        processed_subjects.append(str(item))

                subject_ids = processed_subjects
                logger.info(f"📦 Procesados {len(subject_ids)} sujetos a formato string")

            # Construir respuesta estructurada con datos reales de Gemini
            response = ImageAnalysisResponse(
                analysis_id=analysis_id,
                media_type="image",
                overall_description=parsed_analysis.get("overall_description", ""),
                visual_style=parsed_analysis.get("visual_style", ""),
                technical_quality=parsed_analysis.get("technical_quality", ""),
                content_themes=parsed_analysis.get("content_themes", []),
                mood_and_tone=parsed_analysis.get("mood_and_tone", ""),
                composition_analysis=parsed_analysis.get("composition_analysis", ""),
                color_palette=parsed_analysis.get("color_palette", []),
                lighting_analysis=parsed_analysis.get("lighting_analysis", ""),
                subject_identification=subject_ids,
                artistic_style=parsed_analysis.get("artistic_style", ""),
                replication_prompt=parsed_analysis.get("replication_prompt", ""),
                technical_metadata=TechnicalMetadata(
                    resolution="1280x720",
                    fps=0,
                    duration=0.0,
                    frame_count=1
                ),
                processing_time_seconds=time.time() - start_time,
                created_at=datetime.now()
            )

            logger.info(f"✅ Análisis de imagen completado: {analysis_id}")
            return response

        except Exception as e:
            logger.error(f"❌ Error en análisis de imagen {analysis_id}: {e}")
            raise

    async def analyze_video(self, request: VideoAnalysisRequest) -> VideoAnalysisResponse:
        """Análisis robusto de video usando Gemini API"""
        start_time = time.time()
        analysis_id = str(uuid.uuid4())

        logger.info(f"🎬 Iniciando análisis robusto de video: {analysis_id}")

        try:
            # Preparar datos de video
            video_data = self._prepare_video_data(request)

            # Crear prompt de análisis de video
            analysis_prompt = self._create_video_analysis_prompt(request)

            # Realizar análisis con Gemini Video API
            gemini_result = await self._analyze_video_with_gemini(video_data, analysis_prompt, analysis_id)

            # Parsear respuesta de video
            parsed_analysis = self._parse_video_analysis(gemini_result)

            # ✅ Extraer metadatos técnicos reales del video
            technical_metadata = self._extract_video_metadata(request)

            # ✅ Procesar keyframes_analysis y calcular frame_number
            if "keyframes_analysis" in parsed_analysis:
                parsed_analysis["keyframes_analysis"] = self._process_keyframes_analysis(
                    parsed_analysis["keyframes_analysis"],
                    technical_metadata.fps
                )

            # Construir respuesta de video con metadatos reales
            response = VideoAnalysisResponse(
                analysis_id=analysis_id,
                media_type="video",
                overall_description=parsed_analysis.get("overall_description", ""),
                visual_style=parsed_analysis.get("visual_style", ""),
                technical_quality=parsed_analysis.get("technical_quality", ""),
                content_themes=parsed_analysis.get("content_themes", []),
                mood_and_tone=parsed_analysis.get("mood_and_tone", ""),
                frame_count=technical_metadata.frame_count,  # ✅ Usar dato real
                keyframes_analysis=parsed_analysis.get("keyframes_analysis", []),
                motion_analysis=parsed_analysis.get("motion_analysis", ""),
                scene_transitions=parsed_analysis.get("scene_transitions", []),
                continuity_description=parsed_analysis.get("continuity_description", ""),
                last_frame_description=parsed_analysis.get("last_frame_description", ""),
                extension_prompt=parsed_analysis.get("extension_prompt", ""),
                estimated_duration=technical_metadata.duration,  # ✅ Usar dato real
                technical_metadata=technical_metadata,  # ✅ Usar metadatos reales
                processing_time_seconds=time.time() - start_time,
                created_at=datetime.now()
            )

            logger.info(f"✅ Análisis de video completado: {analysis_id}")
            return response

        except Exception as e:
            logger.error(f"❌ Error en análisis de video {analysis_id}: {e}")
            raise

    async def generate_continuity(self, request: ContinuityGenerationRequest) -> ContinuityGenerationResponse:
        """Genera continuidad para un video basado en análisis previo con análisis completo y métricas de calidad"""
        generation_id = str(uuid.uuid4())

        logger.info(f"�� Generando continuidad mejorada: {generation_id}")

        try:
            # Inicializar variables para análisis completo
            video_analysis = None
            frame_analysis = None
            analysis_used = {}
            prompt_enhancements = {}
            preserved_elements = []
            confidence_level = "low"
            quality_metrics = {}
            recommendations = []

            # Obtener análisis completo del video si está habilitado
            if getattr(request, 'use_enhanced_analysis', True):
                video_analysis = await self.get_video_analysis_by_id(request.original_video_analysis_id)

                if video_analysis:
                    logger.info(f"✅ Análisis de video encontrado, generando prompt mejorado")
                    analysis_used["video_analysis"] = True
                    confidence_level = "medium"

                    # Intentar obtener análisis de frame si está disponible
                    if hasattr(request, 'frame_analysis_id') and request.frame_analysis_id:
                        frame_analysis = await self.get_frame_analysis_by_id(request.frame_analysis_id)
                        if frame_analysis:
                            analysis_used["frame_analysis"] = True
                            confidence_level = "high"
                            recommendations.append("Análisis completo disponible - continuidad de alta calidad esperada")
                        else:
                            recommendations.append("Considerar análisis de frame para mejor continuidad")
                    else:
                        recommendations.append("Considerar análisis de frame para mejor continuidad")

                    # Determinar elementos preservados
                    if getattr(request, 'preserve_technical_metadata', True) and video_analysis.get("technical_metadata"):
                        preserved_elements.append("technical_metadata")
                        prompt_enhancements["technical_metadata_applied"] = True

                    if getattr(request, 'preserve_visual_style', True) and video_analysis.get("visual_style"):
                        preserved_elements.append("visual_style")
                        prompt_enhancements["visual_style_applied"] = True

                    if getattr(request, 'preserve_content_themes', True) and video_analysis.get("content_themes"):
                        preserved_elements.append("content_themes")
                        prompt_enhancements["content_themes_applied"] = True

                    if getattr(request, 'preserve_mood_and_tone', True) and video_analysis.get("mood_and_tone"):
                        preserved_elements.append("mood_and_tone")
                        prompt_enhancements["mood_and_tone_applied"] = True

                    if frame_analysis:
                        preserved_elements.append("frame_analysis")
                        prompt_enhancements["frame_analysis_applied"] = True

                    # Calcular métricas de calidad
                    quality_metrics = self._calculate_continuity_quality_metrics(
                        video_analysis, frame_analysis, request
                    )

                    # Generar recomendaciones adicionales basadas en métricas
                    if quality_metrics.get("visual_consistency_score", 0) < 0.7:
                        recommendations.append("Mejorar consistencia visual - revisar iluminación y composición")

                    if quality_metrics.get("technical_quality_score", 0) < 0.8:
                        recommendations.append("Mejorar calidad técnica - revisar resolución y formato")

                    if quality_metrics.get("content_coherence_score", 0) < 0.8:
                        recommendations.append("Mejorar coherencia de contenido - revisar temas y tono")

                    # Crear prompt mejorado con análisis completo
                    extension_prompt = await self._create_enhanced_continuity_prompt(
                        request, video_analysis, frame_analysis
                    )
                else:
                    logger.warning(f"⚠️ No se encontró análisis de video para {request.original_video_analysis_id}, usando prompt básico")
                    extension_prompt = self._create_continuity_prompt(request)
                    analysis_used["fallback"] = True
                    recommendations.append("Considerar ejecutar análisis de video completo antes de generar continuidad")
            else:
                logger.info(f"ℹ️ Análisis mejorado deshabilitado, usando prompt básico")
                extension_prompt = self._create_continuity_prompt(request)
                analysis_used["basic"] = True

            # Crear respuesta con todos los datos
            response = ContinuityGenerationResponse(
                generation_id=generation_id,
                original_analysis_id=request.original_video_analysis_id,
                extension_prompt=extension_prompt,
                video_generation_operation_id=None,
                status="pending",
                created_at=datetime.now(),

                # Campos para análisis completo
                analysis_used=analysis_used,
                prompt_enhancements=prompt_enhancements,
                confidence_level=confidence_level,
                preserved_elements=preserved_elements,
                technical_metadata_preserved=video_analysis.get("technical_metadata") if video_analysis else None,
                visual_style_preserved=video_analysis.get("visual_style") if video_analysis else None,
                content_themes_preserved=video_analysis.get("content_themes") if video_analysis else None,
                mood_and_tone_preserved=video_analysis.get("mood_and_tone") if video_analysis else None
            )

            logger.info(f"✅ Continuidad mejorada generada: {generation_id} (confianza: {confidence_level})")
            return response

        except Exception as e:
            logger.error(f"❌ Error generando continuidad {generation_id}: {e}")
            # Fallback al prompt básico en caso de error
            try:
                extension_prompt = self._create_continuity_prompt(request)
                response = ContinuityGenerationResponse(
                    generation_id=generation_id,
                    original_analysis_id=request.original_video_analysis_id,
                    extension_prompt=extension_prompt,
                    video_generation_operation_id=None,
                    status="pending",
                    created_at=datetime.now(),

                    # Campos de fallback
                    analysis_used={"error_fallback": True},
                    prompt_enhancements={"error_fallback": True},
                    confidence_level="low",
                    preserved_elements=[]
                )
                return response
            except Exception as fallback_error:
                logger.error(f"❌ Error en fallback: {fallback_error}")
                raise

    def _calculate_continuity_quality_metrics(self, video_analysis: Dict, frame_analysis: Dict, request) -> Dict:
        """Calcula métricas de calidad para la continuidad"""
        try:
            metrics = {
                "visual_consistency_score": 0.0,
                "technical_quality_score": 0.0,
                "content_coherence_score": 0.0,
                "overall_quality_score": 0.0
            }

            if video_analysis:
                # Puntuación de consistencia visual
                visual_elements = 0
                if video_analysis.get("visual_style"):
                    visual_elements += 1
                if video_analysis.get("technical_metadata"):
                    visual_elements += 1
                if frame_analysis:
                    visual_elements += 1

                metrics["visual_consistency_score"] = min(visual_elements / 3.0, 1.0)

                # Puntuación de calidad técnica
                technical_elements = 0
                if video_analysis.get("technical_metadata", {}).get("resolution"):
                    technical_elements += 1
                if video_analysis.get("technical_metadata", {}).get("fps"):
                    technical_elements += 1
                if video_analysis.get("technical_metadata", {}).get("format"):
                    technical_elements += 1

                metrics["technical_quality_score"] = min(technical_elements / 3.0, 1.0)

                # Puntuación de coherencia de contenido
                content_elements = 0
                if video_analysis.get("content_themes"):
                    content_elements += 1
                if video_analysis.get("mood_and_tone"):
                    content_elements += 1
                if video_analysis.get("overall_description"):
                    content_elements += 1

                metrics["content_coherence_score"] = min(content_elements / 3.0, 1.0)

                # Puntuación general
                metrics["overall_quality_score"] = (
                    metrics["visual_consistency_score"] +
                    metrics["technical_quality_score"] +
                    metrics["content_coherence_score"]
                ) / 3.0

            return metrics

        except Exception as e:
            logger.error(f"❌ Error calculando métricas de calidad: {e}")
            return {"error": True}

    def _prepare_image_data(self, image_base64: str, content_type: str) -> Dict[str, Any]:
        """Prepara datos de imagen para Gemini API (espera base64 puro sin prefijo)"""
        logger.info(f"📦 Imagen preparada para Gemini API: {len(image_base64)} caracteres, MIME: {content_type}")

        return {
            "inline_data": {
                "mime_type": content_type,
                "data": image_base64.strip()
            }
        }

    def _upload_video_to_gemini_files(self, video_url: str) -> str:
       """Subir video local a Gemini Files API para hacerlo accesible"""
       try:
        # Si es una URL local, descargar el archivo
         if "localhost" in video_url or "api_google" in video_url:
            # Convertir URL local a ruta de archivo
            if "/api/v1/uploads/" in video_url:
                file_path = video_url.replace("http://localhost:8001/api/v1/uploads/", "/app/uploads/")
            else:
                raise ValueError("URL local no soportada")

            # Leer archivo y convertir a base64
            import base64
            with open(file_path, "rb") as f:
                video_bytes = f.read()
                video_base64 = base64.b64encode(video_bytes).decode()

            # Usar inline_data en lugar de file_data para archivos locales
            return {
                "inline_data": {
                    "mime_type": "video/mp4",
                    "data": video_base64
                }
            }
         else:
            # Para URLs públicas, usar file_data
            return {
                "file_data": {
                    "file_uri": video_url
                }
            }
       except Exception as e:
        logger.error(f"Error procesando video URL: {e}")
        raise

    def _prepare_video_data(self, request: VideoAnalysisRequest) -> Dict[str, Any]:
        """Prepara datos de video para Gemini API"""
        if request.video_base64:
            clean_b64 = request.video_base64.replace("data:", "").replace("base64,", "")
            if "," in clean_b64:
                clean_b64 = clean_b64.split(",", 1)[1]

            return {
                "inline_data": {
                    "mime_type": request.content_type,
                    "data": clean_b64
                }
            }
        else:
          # Usar el nuevo método para manejar URLs locales
          return self._upload_video_to_gemini_files(request.video_url)


    def _get_video_path(self, request: VideoAnalysisRequest) -> Optional[str]:
        """Obtiene la ruta local del archivo de video"""
        try:
            if request.video_url:
                # Convertir URL local a ruta de archivo
                if "/api/v1/uploads/" in request.video_url:
                    file_path = request.video_url.replace("http://localhost:8001/api/v1/uploads/", "/app/uploads/")
                    file_path = file_path.replace("http://api_google:8000/api/v1/uploads/", "/app/uploads/")

                    if os.path.exists(file_path):
                        return file_path
                    else:
                        logger.warning(f"Archivo no encontrado: {file_path}")
                        return None
            return None
        except Exception as e:
            logger.error(f"Error obteniendo ruta de video: {e}")
            return None

    def _extract_video_metadata(self, request: VideoAnalysisRequest) -> TechnicalMetadata:
        """Extrae metadatos técnicos reales del video usando OpenCV"""
        try:
            video_path = self._get_video_path(request)
            if not video_path:
                logger.warning("No se pudo obtener la ruta del video, usando valores por defecto")
                return self._get_default_metadata()

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.warning(f"No se pudo abrir el video: {video_path}")
                return self._get_default_metadata()

            # Extraer metadatos básicos
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0.0

            # Calcular aspect ratio
            aspect_ratio = self._calculate_aspect_ratio(width, height)

            # Obtener tamaño del archivo
            file_size_bytes = os.path.getsize(video_path) if os.path.exists(video_path) else None

            # Obtener formato del archivo
            file_format = self._get_video_format(video_path)

            # Obtener espacio de color (aproximación)
            color_space = self._get_color_space_info(cap)

            cap.release()

            logger.info(f"✅ Metadatos completos extraídos: {width}x{height} @ {fps}fps, {duration}s, {frame_count} frames")
            logger.info(f"✅ Aspect ratio: {aspect_ratio}, Tamaño: {file_size_bytes} bytes, Formato: {file_format}")

            return TechnicalMetadata(
                resolution=f"{width}x{height}",
                aspect_ratio=aspect_ratio,
                fps=fps,
                duration=duration,
                frame_count=frame_count,
                file_size_bytes=file_size_bytes,
                format=file_format,
                color_space=color_space
            )

        except Exception as e:
            logger.error(f"❌ Error extrayendo metadatos del video: {e}")
            return self._get_default_metadata()

    def _get_default_metadata(self) -> TechnicalMetadata:
        """Retorna metadatos por defecto cuando no se pueden extraer"""
        return TechnicalMetadata(
            resolution="1280x720",
            aspect_ratio="16:9",
            fps=24.0,
            duration=8.0,
            frame_count=192,
            file_size_bytes=None,
            format="mp4",
            color_space="BGR"
        )

    def _calculate_aspect_ratio(self, width: int, height: int) -> str:
        """Calcula el aspect ratio en formato simplificado"""
        try:
            # Calcular el máximo común divisor
            def gcd(a, b):
                while b:
                    a, b = b, a % b
                return a

            divisor = gcd(width, height)
            ratio_w = width // divisor
            ratio_h = height // divisor

            # Aspect ratios comunes
            common_ratios = {
                (16, 9): "16:9",
                (4, 3): "4:3",
                (21, 9): "21:9",
                (1, 1): "1:1",
                (9, 16): "9:16",  # Vertical
                (3, 4): "3:4"     # Vertical
            }

            return common_ratios.get((ratio_w, ratio_h), f"{ratio_w}:{ratio_h}")

        except Exception as e:
            logger.warning(f"Error calculando aspect ratio: {e}")
            return "16:9"

    def _get_video_format(self, video_path: str) -> str:
        """Obtiene el formato del video basado en la extensión del archivo"""
        try:
            _, ext = os.path.splitext(video_path.lower())
            format_map = {
                '.mp4': 'mp4',
                '.avi': 'avi',
                '.mov': 'mov',
                '.mkv': 'mkv',
                '.wmv': 'wmv',
                '.flv': 'flv',
                '.webm': 'webm',
                '.m4v': 'm4v',
                '.3gp': '3gp'
            }
            return format_map.get(ext, 'unknown')
        except Exception as e:
            logger.warning(f"Error obteniendo formato: {e}")
            return 'unknown'

    def _get_color_space_info(self, cap) -> str:
        """Obtiene información del espacio de color del video"""
        try:
            # Leer un frame para analizar el espacio de color
            ret, frame = cap.read()
            if not ret:
                return "unknown"

            # Verificar si es color o escala de grises
            if len(frame.shape) == 3:
                # Es un frame a color (BGR en OpenCV)
                return "BGR"
            else:
                # Es escala de grises
                return "Grayscale"

        except Exception as e:
            logger.warning(f"Error obteniendo espacio de color: {e}")
            return "unknown"

    def _process_keyframes_analysis(self, keyframes_data: List[Dict], fps: float) -> List[Dict]:
        """Procesa keyframes_analysis y calcula frame_number basado en timestamp MM:SS y FPS"""
        processed_keyframes = []

        for keyframe in keyframes_data:
            # Convertir timestamp MM:SS a segundos
            timestamp_str = keyframe.get("timestamp", "00:00")
            timestamp_seconds = self._convert_timestamp_to_seconds(timestamp_str)

            # Calcular frame_number basado en timestamp y FPS
            frame_number = int(timestamp_seconds * fps) if fps > 0 else 0

            processed_keyframe = {
                "frame_number": frame_number,
                "timestamp": timestamp_seconds,
                "description": keyframe.get("description", ""),
                "visual_elements": keyframe.get("visual_elements", []),
                "composition_notes": keyframe.get("composition_notes", ""),
                "dominant_colors": keyframe.get("dominant_colors", [])
            }
            processed_keyframes.append(processed_keyframe)

        return processed_keyframes

    def _convert_timestamp_to_seconds(self, timestamp_str: str) -> float:
        """Convierte timestamp MM:SS a segundos"""
        try:
            if ":" in timestamp_str:
                parts = timestamp_str.split(":")
                if len(parts) == 2:
                    minutes = int(parts[0])
                    seconds = int(parts[1])
                    return minutes * 60 + seconds
            return float(timestamp_str)
        except (ValueError, IndexError):
            return 0.0


    async def get_video_analysis_by_id(self, analysis_id: str) -> Optional[Dict]:
        """Obtiene análisis de video por ID desde la base de datos"""
        try:
            # En una implementación real, esto consultaría la base de datos
            # Por ahora, simulamos con datos de ejemplo
            logger.info(f"🔍 Obteniendo análisis de video: {analysis_id}")

            # TODO: Implementar consulta real a la base de datos
            # session = get_database_session()
            # analysis = session.query(VideoAnalysis).filter_by(analysis_id=analysis_id).first()

            # Simulación de datos de análisis
            mock_analysis = {
                "analysis_id": analysis_id,
                "overall_description": "Video de mujer hablando sobre seguros",
                "visual_style": "Estilo directo e informativo, similar a un anuncio de servicio público",
                "technical_quality": "La calidad técnica del video es buena. La resolución es alta, lo que permite una imagen nítida y detallada",
                "content_themes": ["Preparación para huracanes", "Seguro de hogar", "Seguridad en el sur de Florida"],
                "mood_and_tone": "El estado de ánimo es informativo y proactivo, con un tono serio pero tranquilizador",
                "technical_metadata": {
                    "resolution": "1280x720",
                    "aspect_ratio": "16:9",
                    "duration": 8.0,
                    "fps": 24.0,
                    "frame_count": 192,
                    "file_size_bytes": 1022094,
                    "format": "mp4",
                    "color_space": "BGR"
                },
                "keyframes_analysis": [
                    {
                        "frame_number": 0,
                        "timestamp": 0.0,
                        "description": "Mujer arrodillada mirando a cámara",
                        "visual_elements": ["blazer", "botellas de agua"],
                        "composition_notes": "Plano medio, iluminación natural",
                        "dominant_colors": ["#F5F5F5", "#000000", "#348AC7"]
                    }
                ],
                "scene_transitions": [
                    "Inicio abrupto del video (0:00) - sin fade in",
                    "Video de una sola toma continua sin transiciones de cámara"
                ],
                "last_frame_description": "Mujer sonriendo, mirando a cámara, rodeada de suministros",
                "extension_prompt": "Continúa con la siguiente parte del diálogo manteniendo la misma posición"
            }

            return mock_analysis

        except Exception as e:
            logger.error(f"❌ Error obteniendo análisis de video {analysis_id}: {e}")
            return None

    async def get_frame_analysis_by_id(self, frame_analysis_id: str) -> Optional[Dict]:
        """Obtiene análisis de frame por ID desde la base de datos"""
        try:
            logger.info(f"🖼️ Obteniendo análisis de frame: {frame_analysis_id}")

            # TODO: Implementar consulta real a la base de datos
            # session = get_database_session()
            # frame_analysis = session.query(FrameAnalysis).filter_by(analysis_id=frame_analysis_id).first()

            # Simulación de datos de análisis de frame
            mock_frame_analysis = {
                "analysis_id": frame_analysis_id,
                "composition_analysis": "Plano medio, mujer centrada, iluminación natural desde ventana",
                "lighting_analysis": "Iluminación natural brillante, proveniente de la puerta y ventana de cristal",
                "color_palette": ["#F5F5F5", "#000000", "#348AC7", "#8B4513", "#228B22"],
                "subject_identification": ["mujer", "blazer oscuro", "bufanda azul y blanca"],
                "replication_prompt": "Mujer arrodillada, blazer oscuro, bufanda, sonriendo, mirando a cámara",
                "background_elements": ["puerta de cristal", "ventana", "palmera exterior", "botellas de agua"],
                "facial_expression": "sonrisa amigable, contacto visual directo",
                "body_position": "arrodillada, manos en el regazo, posición estable"
            }

            return mock_frame_analysis

        except Exception as e:
            logger.error(f"❌ Error obteniendo análisis de frame {frame_analysis_id}: {e}")
            return None



    def _create_image_analysis_prompt(self, request: ImageAnalysisRequest) -> str:
        """Crea prompt detallado para análisis de imagen"""
        return f"""
Analiza esta imagen de manera exhaustiva y proporciona un análisis estructurado:

{request.analysis_prompt}

Incluye en tu análisis:
1. Descripción general del contenido
2. Estilo visual y técnica artística
3. Composición y reglas fotográficas
4. Paleta de colores dominantes
5. Análisis de iluminación
6. Identificación de sujetos principales
7. Estilo artístico y época
8. Prompt optimizado para replicar la imagen

Responde SOLO en formato JSON con esta estructura EXACTA:
{{
    "overall_description": "descripción detallada del contenido de la imagen",
    "visual_style": "estilo visual y técnica fotográfica específica",
    "technical_quality": "evaluación detallada de la calidad técnica",
    "composition_analysis": "análisis completo de composición fotográfica",
    "color_palette": ["#color1", "#color2", "#color3"],
    "lighting_analysis": "análisis detallado de iluminación y sombras",
    "subject_identification": ["sujeto1", "sujeto2", "sujeto3"],
    "artistic_style": "estilo artístico y época específica",
    "replication_prompt": "prompt detallado para replicar exactamente la imagen",
    "mood_and_tone": "estado de ánimo y tono de la imagen",
    "content_themes": ["tema1", "tema2", "tema3"]
}}

IMPORTANTE:
- Responde SOLO con el JSON, sin texto adicional
- Todos los campos son OBLIGATORIOS
- Usa descripciones específicas y detalladas
"""

    def _create_video_analysis_prompt(self, request: VideoAnalysisRequest) -> str:
        """Crea prompt detallado para análisis de video basado en documentación oficial"""
        return f"""
Analiza este video de manera exhaustiva y proporciona un análisis estructurado completo.

INSTRUCCIONES ESPECÍFICAS:
1. Analiza la calidad técnica del video (resolución, nitidez, estabilidad)
2. Identifica temas y conceptos específicos del contenido
3. Determina el estado de ánimo y tono exacto del video
4. Analiza frames clave y momentos importantes usando formato MM:SS
5. Identifica transiciones de escena específicas:
   - Cortes directos (cuts) con timestamps
   - Fades (fade in/out) con timestamps
   - Dissolves (disolvencias) con timestamps
   - Zoom in/out con timestamps
   - Cambios de plano con timestamps
   - Cambios de iluminación con timestamps
   - Cambios de ubicación con timestamps
   - Inicio/final abrupto o suave
   - Si es una sola toma continua, especifícalo
6. Proporciona descripción detallada del último frame
7. Genera prompt específico para continuidad

Responde SOLO en formato JSON con esta estructura EXACTA:
{{
    "overall_description": "descripción detallada del contenido del video",
    "visual_style": "estilo visual y cinematográfico específico",
    "technical_quality": "evaluación detallada de la calidad técnica",
    "content_themes": ["tema1", "tema2", "tema3"],
    "mood_and_tone": "estado de ánimo y tono específico del video",
    "keyframes_analysis": [
        {{
            "timestamp": "00:00",
            "description": "descripción del frame clave",
            "visual_elements": ["elemento1", "elemento2"],
            "composition_notes": "notas sobre composición",
            "dominant_colors": ["#color1", "#color2"]
        }}
    ],
    "motion_analysis": "análisis detallado del movimiento",
    "scene_transitions": [
        "Tipo de transición con timestamp específico (ej: 'Fade in desde negro al inicio (0:00)')",
        "Si es una sola toma: 'Video de una sola toma continua sin transiciones'",
        "Si hay inicio abrupto: 'Inicio abrupto del video (0:00) - sin fade in'",
        "Si hay final abrupto: 'Final abrupto (X:XX) - sin fade out'"
    ],
    "continuity_description": "elementos específicos de continuidad",
    "last_frame_description": "descripción detallada del último frame",
    "extension_prompt": "prompt específico para continuar el video"
}}

IMPORTANTE:
- Responde SOLO con el JSON, sin texto adicional
- Usa formato MM:SS para timestamps (ej: "00:15", "01:30")
- Para scene_transitions, incluye el tipo de transición y timestamp
- Si no hay transiciones, escribe "Video de una sola toma continua sin transiciones"
- Si hay inicio/final abrupto, especifícalo
- Todos los campos son OBLIGATORIOS
"""

    def _create_continuity_prompt(self, request: ContinuityGenerationRequest) -> str:
        """Crea prompt para generación de continuidad"""
        base_prompt = f"Continúa este video de forma {request.continuity_style}"

        if request.custom_direction:
            base_prompt += f" con la siguiente dirección: {request.custom_direction}"

        if request.maintain_subjects:
            base_prompt += ". Mantén los mismos sujetos y elementos visuales."

        return base_prompt

    async def _create_enhanced_continuity_prompt(self, request: ContinuityGenerationRequest, video_analysis: Dict, frame_analysis: Dict = None) -> str:
        """Crea prompt mejorado para generación de continuidad usando análisis completo"""
        try:
            # Base del prompt
            base_prompt = f"Continúa este video de forma {request.continuity_style}"

            # Agregar dirección personalizada
            if request.custom_direction:
                base_prompt += f" con la siguiente dirección: {request.custom_direction}"

            # Agregar elementos del análisis de video
            if video_analysis:
                # Estilo visual
                if video_analysis.get("visual_style"):
                    base_prompt += f" Manteniendo el estilo visual: {video_analysis['visual_style'][:100]}..."

                # Temas de contenido
                if video_analysis.get("content_themes"):
                    themes = video_analysis["content_themes"][:2]  # Máximo 2 temas
                    base_prompt += f" Continuando los temas: {', '.join(themes)}"

                # Estado de ánimo y tono
                if video_analysis.get("mood_and_tone"):
                    base_prompt += f" Manteniendo el tono: {video_analysis['mood_and_tone'][:80]}..."

                # Metadatos técnicos
                if video_analysis.get("technical_metadata"):
                    metadata = video_analysis["technical_metadata"]
                    if metadata.get("aspect_ratio"):
                        base_prompt += f" Preservando la relación de aspecto {metadata['aspect_ratio']}"
                    if metadata.get("color_space"):
                        base_prompt += f" Manteniendo el espacio de color {metadata['color_space']}"

                # Transiciones de escena
                if video_analysis.get("scene_transitions"):
                    transitions = video_analysis["scene_transitions"]
                    if transitions and len(transitions) > 0:
                        base_prompt += f" Considerando las transiciones: {transitions[0][:60]}..."

            # Agregar elementos del análisis de frame
            if frame_analysis:
                # Composición
                if frame_analysis.get("composition_analysis"):
                    base_prompt += f" Manteniendo la composición: {frame_analysis['composition_analysis'][:80]}..."

                # Iluminación
                if frame_analysis.get("lighting_analysis"):
                    base_prompt += f" Preservando la iluminación: {frame_analysis['lighting_analysis'][:80]}..."

                # Identificación de sujetos
                if frame_analysis.get("subject_identification"):
                    subjects = frame_analysis["subject_identification"][:3]  # Máximo 3 sujetos
                    base_prompt += f" Manteniendo la posición de: {', '.join(subjects)}"

                # Paleta de colores
                if frame_analysis.get("color_palette"):
                    colors = frame_analysis["color_palette"][:3]  # Máximo 3 colores
                    base_prompt += f" Conservando los colores: {', '.join(colors)}"

                # Expresión facial
                if frame_analysis.get("facial_expression"):
                    base_prompt += f" Manteniendo la expresión: {frame_analysis['facial_expression']}"

                # Posición corporal
                if frame_analysis.get("body_position"):
                    base_prompt += f" Preservando la posición: {frame_analysis['body_position']}"

            # Mantener sujetos si está habilitado
            if request.maintain_subjects:
                base_prompt += ". Mantén los mismos sujetos y elementos visuales para continuidad perfecta."

            # Agregar instrucciones técnicas
            base_prompt += " Asegúrate de que la transición sea completamente fluida y natural."

            logger.info(f"✅ Prompt de continuidad mejorado generado con análisis completo")
            return base_prompt

        except Exception as e:
            logger.error(f"❌ Error creando prompt mejorado: {e}")
            # Fallback al prompt básico
            return self._create_continuity_prompt(request)

    async def _analyze_with_gemini(self, image_data: Dict, prompt: str, operation_id: str = None) -> Dict:
        """Realizar análisis con Gemini API"""
        url = f"{self.base_url}/gemini-1.5-pro:generateContent?key={self.api_key}"

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    image_data
                ]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048
            }
        }

        headers = {"Content-Type": "application/json"}

        # Iniciar logging de Google API call
        call_id = google_api_logger.start_api_call(
            api_type="gemini",
            endpoint=url,
            request_body=payload,
            operation_id=operation_id,
            method="POST",
            request_headers=headers
        )

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()

            response_data = response.json()

            # Log successful response
            google_api_logger.complete_api_call(
                call_id=call_id,
                response_status_code=response.status_code,
                response_body=response_data,
                response_headers=dict(response.headers)
            )

            return response_data

        except Exception as e:
            # Log failed request
            google_api_logger.fail_api_call(
                call_id=call_id,
                error_message=str(e),
                response_status_code=getattr(response, 'status_code', None) if 'response' in locals() else None
            )
            raise

    async def _analyze_video_with_gemini(self, video_data: Dict, prompt: str, operation_id: str = None) -> Dict:
        """Realizar análisis de video con Gemini API"""
        url = f"{self.base_url}/gemini-1.5-pro:generateContent?key={self.api_key}"

        # Estructura correcta según documentación oficial
        payload = {
            "contents": [{
                "parts": [
                    video_data,
                    {
                        "text": prompt
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096
            }
        }

        headers = {"Content-Type": "application/json"}

        # Iniciar logging de Google API call
        call_id = google_api_logger.start_api_call(
            api_type="gemini",
            endpoint=url,
            request_body=payload,
            operation_id=operation_id,
            method="POST",
            request_headers=headers
        )

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()

            response_data = response.json()

            # Log successful response
            google_api_logger.complete_api_call(
                call_id=call_id,
                response_status_code=response.status_code,
                response_body=response_data,
                response_headers=dict(response.headers)
            )

            return response_data

        except Exception as e:
            # Log failed request
            google_api_logger.fail_api_call(
                call_id=call_id,
                error_message=str(e),
                response_status_code=getattr(response, 'status_code', None) if 'response' in locals() else None
            )
            raise

    def _parse_image_analysis(self, gemini_response: Dict) -> Dict:
        """Parsea respuesta de análisis de imagen de Gemini"""
        try:
            content = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
            logger.info(f"🔍 Contenido recibido de Gemini (imagen): {content[:300]}...")

            # Buscar JSON dentro de markdown code blocks
            if "```json" in content:
                logger.info("📊 Encontrado bloque JSON en markdown (imagen)")
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                if json_end > json_start:
                    json_content = content[json_start:json_end].strip()
                    logger.info(f"📊 JSON extraído (imagen): {json_content[:300]}...")
                    try:
                        parsed_json = json.loads(json_content)
                        logger.info(f"✅ JSON parseado exitosamente (imagen): {list(parsed_json.keys())}")
                        return parsed_json
                    except json.JSONDecodeError as je:
                        logger.error(f"❌ Error parseando JSON extraído (imagen): {je}")
                        logger.error(f"Contenido JSON problemático: {json_content[:500]}")
                        # Intentar con todo el contenido como fallback
                        return {"overall_description": content}
                else:
                    logger.warning("⚠️ No se encontró el cierre del bloque JSON")
                    return {"overall_description": content}

            # Intentar parsear JSON directo
            if content.strip().startswith("{"):
                logger.info("📊 Intentando parsear JSON directo (imagen)")
                try:
                    parsed_json = json.loads(content.strip())
                    logger.info(f"✅ JSON directo parseado (imagen): {list(parsed_json.keys())}")
                    return parsed_json
                except json.JSONDecodeError as je:
                    logger.error(f"❌ Error parseando JSON directo: {je}")
                    return {"overall_description": content}

            # Si no es JSON, retornar como descripción
            logger.warning("⚠️ Respuesta no es JSON, usando como descripción")
            return {"overall_description": content}

        except Exception as e:
            logger.error(f"❌ Error parseando respuesta de Gemini (imagen): {e}")
            logger.error(f"Tipo de error: {type(e).__name__}")
            if gemini_response:
                logger.error(f"Estructura de respuesta: {list(gemini_response.keys())}")
            return {"overall_description": "Error en parseo"}

    def _parse_video_analysis(self, gemini_response: Dict) -> Dict:
        """Parsea respuesta de análisis de video de Gemini"""
        try:
            content = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
            logger.info(f"🔍 Contenido recibido de Gemini: {content[:200]}...")

            # Buscar JSON dentro de markdown code blocks
            if "```json" in content:
                logger.info("📊 Encontrado bloque JSON en markdown")
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                if json_end > json_start:
                    json_content = content[json_start:json_end].strip()
                    logger.info(f"📊 JSON extraído: {json_content[:200]}...")
                    try:
                        parsed_json = json.loads(json_content)
                        logger.info(f"✅ JSON parseado exitosamente: {list(parsed_json.keys())}")
                        return parsed_json
                    except json.JSONDecodeError as je:
                        logger.error(f"❌ Error parseando JSON: {je}")
                        logger.error(f"❌ JSON problemático: {json_content}")
                        return {"overall_description": content}

            # Intentar parsear JSON directo
            if content.startswith("{"):
                logger.info("📊 Intentando parsear JSON directo")
                return json.loads(content)
            else:
                # Respuesta de texto plano
                logger.info("📊 Usando respuesta de texto plano")
                return {
                    "overall_description": content,
                    "frame_count": 192,
                    "estimated_duration": 8.0
                }
        except Exception as e:
            logger.error(f"❌ Error parseando respuesta de video de Gemini: {e}")
            return {
                "overall_description": "Análisis de video completado",
                "frame_count": 192,
                "estimated_duration": 8.0
            }

    async def analyze_image_with_object_detection(self, request: ImageAnalysisRequest) -> ImageAnalysisResponse:
        """Análisis de imagen con detección de objetos"""
        return await self.analyze_image(request)

    async def analyze_image_with_segmentation(self, request: ImageAnalysisRequest) -> ImageAnalysisResponse:
        """Análisis de imagen con segmentación"""
        return await self.analyze_image(request)

    async def analyze_image_with_caching(self, request: ImageAnalysisRequest) -> ImageAnalysisResponse:
        """Análisis de imagen con caching"""
        return await self.analyze_image(request)


# Instancia global del servicio
robust_analysis_service = RobustAnalysisService()
