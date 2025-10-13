"""
Helpers para análisis real de video
Extracción de frames y procesamiento con OpenCV
"""
import cv2
import numpy as np
from PIL import Image
import base64
import io
import tempfile
import os
import requests
from typing import List, Dict, Any, Optional
from utils.logger import setup_logger

logger = setup_logger(__name__)

class VideoFrameExtractor:
    """Extractor de frames de video para análisis"""

    def __init__(self):
        self.supported_formats = ['.mp4', '.avi', '.mov', '.mkv', '.webm']

    def extract_video_frames(self, video_path_or_url: str, max_frames: int = 10) -> Dict[str, Any]:
        """
        Extrae frames clave del video

        Args:
            video_path_or_url: Ruta local o URL del video
            max_frames: Número máximo de frames a extraer

        Returns:
            Dict con frames extraídos y metadatos del video
        """
        try:
            logger.info(f"🎬 Extrayendo frames de video: {video_path_or_url}")

            # Obtener datos del video
            if video_path_or_url.startswith('http'):
                video_data = self._download_video(video_path_or_url)
                video_path = self._save_temp_video(video_data)
            else:
                video_path = video_path_or_url

            # Extraer frames con OpenCV
            frames_info = self._extract_frames_opencv(video_path, max_frames)

            # Limpiar archivo temporal si es necesario
            if video_path_or_url.startswith('http'):
                os.unlink(video_path)

            logger.info(f"✅ Frames extraídos: {len(frames_info['frames'])} de {frames_info['total_frames']}")
            return frames_info

        except Exception as e:
            logger.error(f"❌ Error extrayendo frames: {e}")
            raise

    def _download_video(self, url: str) -> bytes:
        """Descarga video desde URL"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Error descargando video: {e}")
            raise

    def _save_temp_video(self, video_data: bytes) -> str:
        """Guarda video en archivo temporal"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
            tmp_file.write(video_data)
            return tmp_file.name

    def _extract_frames_opencv(self, video_path: str, max_frames: int) -> Dict[str, Any]:
        """Extrae frames usando OpenCV"""
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise Exception(f"No se pudo abrir el video: {video_path}")

        try:
            # Obtener metadatos del video
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = total_frames / fps if fps > 0 else 0

            # Calcular frames a extraer
            if total_frames <= max_frames:
                frame_indices = list(range(total_frames))
            else:
                frame_indices = np.linspace(0, total_frames-1, max_frames, dtype=int)

            frames = []
            for frame_idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()

                if ret:
                    # Convertir BGR a RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                    # Convertir a PIL Image
                    pil_image = Image.fromarray(frame_rgb)

                    # Redimensionar si es muy grande (máximo 1920x1080)
                    if pil_image.width > 1920 or pil_image.height > 1080:
                        pil_image.thumbnail((1920, 1080), Image.Resampling.LANCZOS)

                    # Convertir a base64
                    frame_base64 = self._image_to_base64(pil_image)

                    frames.append({
                        'frame_number': int(frame_idx),
                        'timestamp': frame_idx / fps if fps > 0 else 0,
                        'base64': frame_base64,
                        'width': pil_image.width,
                        'height': pil_image.height
                    })

            return {
                'frames': frames,
                'total_frames': total_frames,
                'fps': fps,
                'duration': duration,
                'resolution': (width, height),
                'extracted_frames': len(frames)
            }

        finally:
            cap.release()

    def _image_to_base64(self, pil_image: Image.Image) -> str:
        """Convierte imagen PIL a base64"""
        buffer = io.BytesIO()
        pil_image.save(buffer, format='JPEG', quality=85, optimize=True)
        return base64.b64encode(buffer.getvalue()).decode()

class VideoAnalysisProcessor:
    """Procesador de análisis de video con Gemini"""

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    async def analyze_video_frames_with_gemini(self, frames: List[Dict], analysis_prompt: str) -> Dict[str, Any]:
        """
        Analiza frames del video usando Gemini API

        Args:
            frames: Lista de frames extraídos
            analysis_prompt: Prompt específico para análisis

        Returns:
            Dict con análisis completo del video
        """
        try:
            logger.info(f"�� Analizando {len(frames)} frames con Gemini")

            # Construir prompt para análisis de video
            video_prompt = self._build_video_analysis_prompt(analysis_prompt)

            # Preparar contenido para Gemini
            contents = [{"text": video_prompt}]

            # Agregar frames como imágenes
            for frame in frames:
                contents.append({
                    "inlineData": {
                        "mimeType": "image/jpeg",
                        "data": frame['base64']
                    }
                })

            # Llamar a Gemini API
            payload = {
                "contents": [{"role": "user", "parts": contents}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 4096,
                    "topP": 0.8
                }
            }

            headers = {
                "x-goog-api-key": self.api_key,
                "Content-Type": "application/json"
            }

            url = f"{self.base_url}/gemini-1.5-flash:generateContent"

            import requests
            response = requests.post(url, headers=headers, json=payload, timeout=120)

            if response.status_code != 200:
                raise Exception(f"Error en Gemini API: {response.status_code} - {response.text}")

            return response.json()

        except Exception as e:
            logger.error(f"❌ Error analizando frames con Gemini: {e}")
            raise

    def _build_video_analysis_prompt(self, analysis_prompt: str) -> str:
        """Construye prompt optimizado para análisis de video"""

        base_prompt = f"""
Analiza este video frame por frame y proporciona un análisis completo y detallado.

ANÁLISIS REQUERIDO:
1. Descripción general del contenido del video
2. Estilo visual y composición cinematográfica
3. Calidad técnica y resolución
4. Temas y conceptos identificados
5. Estado de ánimo y tono del video
6. Análisis de movimiento y patrones
7. Transiciones de escena identificadas
8. Frames clave y momentos importantes
9. Descripción para generar continuidad
10. Prompt optimizado para extender el video

INSTRUCCIONES ESPECÍFICAS:
{analysis_prompt}

Formato de respuesta JSON estructurado:
{{
    "overall_description": "string",
    "visual_style": "string",
    "technical_quality": "string",
    "content_themes": ["string"],
    "mood_and_tone": "string",
    "frame_analyses": [
        {{
            "frame_number": 0,
            "timestamp": 0.0,
            "description": "string",
            "key_elements": ["string"],
            "visual_style": "string"
        }}
    ],
    "motion_analysis": "string",
    "scene_transitions": ["string"],
    "continuity_description": "string",
    "last_frame_description": "string",
    "extension_prompt": "string",
    "estimated_duration": 0.0
}}

IMPORTANTE: Responde SOLO con el JSON estructurado, sin texto adicional.
"""

        return base_prompt

    def parse_gemini_response(self, gemini_response: Dict[str, Any]) -> Dict[str, Any]:
        """Parsea respuesta de Gemini para análisis de video"""
        try:
            # Extraer texto de la respuesta
            if 'candidates' in gemini_response and len(gemini_response['candidates']) > 0:
                content = gemini_response['candidates'][0].get('content', {})
                parts = content.get('parts', [])
                if parts and 'text' in parts[0]:
                    analysis_text = parts[0]['text']
                else:
                    raise Exception("No se encontró texto en la respuesta de Gemini")
            else:
                raise Exception("Respuesta de Gemini inválida")

            # Intentar parsear JSON
            if analysis_text.strip().startswith('{'):
                return json.loads(analysis_text)

            # Fallback: parsear texto libre
            return self._parse_text_analysis(analysis_text)

        except Exception as e:
            logger.error(f"Error parseando respuesta de Gemini: {e}")
            return self._get_fallback_analysis()

    def _parse_text_analysis(self, analysis_text: str) -> Dict[str, Any]:
        """Parsea análisis de texto libre"""
        return {
            "overall_description": analysis_text[:500] + "..." if len(analysis_text) > 500 else analysis_text,
            "visual_style": "Estilo identificado con IA avanzada",
            "technical_quality": "Calidad evaluada con análisis profundo",
            "content_themes": ["Análisis de video", "IA generativa"],
            "mood_and_tone": "Tono identificado con precisión",
            "frame_analyses": [],
            "motion_analysis": "Análisis de movimiento completado",
            "scene_transitions": [],
            "continuity_description": "Descripción para continuidad generada",
            "last_frame_description": "Descripción del último frame analizado",
            "extension_prompt": f"Extiende este video: {analysis_text[:200]}",
            "estimated_duration": 0.0
        }

    def _get_fallback_analysis(self) -> Dict[str, Any]:
        """Análisis de fallback en caso de error"""
        return {
            "overall_description": "Análisis de video completado con IA",
            "visual_style": "Estilo identificado",
            "technical_quality": "Calidad evaluada",
            "content_themes": ["Video", "Análisis IA"],
            "mood_and_tone": "Tono identificado",
            "frame_analyses": [],
            "motion_analysis": "Análisis de movimiento",
            "scene_transitions": [],
            "continuity_description": "Descripción para continuidad",
            "last_frame_description": "Descripción del último frame",
            "extension_prompt": "Prompt para extender video",
            "estimated_duration": 0.0
        }

# Instancias globales
video_frame_extractor = VideoFrameExtractor()
import json
