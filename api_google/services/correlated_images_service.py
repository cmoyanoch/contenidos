"""
Servicio para generar imágenes correlacionadas desde escenas
Genera 2 imágenes por escena (inicio y final) manteniendo consistencia visual
"""
import os
import re
import base64
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from utils.logger import setup_logger
from utils.config import get_settings

logger = setup_logger(__name__)


class CorrelatedImagesService:
    """Servicio para generar imágenes correlacionadas desde escenas"""

    def __init__(self):
        self.settings = get_settings()
        self.upload_dir = Path("uploads/clips")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def extract_dialogue_from_prompt(self, prompt: str) -> str:
        """Extrae el diálogo del prompt de la escena"""
        try:
            # Buscar diálogo entre comillas después de "speaking directly to the camera in Spanish:"
            dialogue_match = re.search(r'speaking directly to the camera in Spanish:\s*"([^"]+)"', prompt)
            if dialogue_match:
                dialogue = dialogue_match.group(1)
                # Limpiar el diálogo (remover "..." al inicio si existe)
                dialogue = dialogue.replace("...", "").strip()
                return dialogue

            # Fallback: buscar cualquier texto entre comillas
            fallback_match = re.search(r'"([^"]+)"', prompt)
            if fallback_match:
                return fallback_match.group(1)

            return "Diálogo no encontrado"

        except Exception as e:
            logger.error(f"❌ Error extrayendo diálogo: {e}")
            return "Error extrayendo diálogo"

    def generate_image_with_gemini(
        self,
        prompt: str,
        reference_image_base64: str,
        aspect_ratio: str = "16:9",
        character_style: str = "realistic",
        temperature: float = 0.7,
        max_output_tokens: int = 2048
    ) -> Optional[str]:
        """Genera una imagen usando Google Gemini API"""
        try:
            logger.info(f"🎨 Generando imagen con Gemini...")

            # Preparar prompt mejorado
            enhanced_prompt = self._enhance_prompt_for_generation(prompt, character_style)

            # Construir las partes del contenido
            parts = [
                {
                    "text": enhanced_prompt
                }
            ]

            # Agregar imagen de referencia si existe
            if reference_image_base64 and reference_image_base64.strip():
                clean_base64 = self._process_base64_image(reference_image_base64)
                parts.append({
                    "inlineData": {
                        "mimeType": "image/png",
                        "data": clean_base64
                    }
                })

            # Configurar parámetros de generación
            generation_config = {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens
            }

            # Preparar payload para Gemini
            payload = {
                "contents": [{
                    "parts": parts
                }],
                "generationConfig": generation_config
            }

            # Llamar a Gemini API para generación de imágenes
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={self.settings.GOOGLE_API_KEY}"
            headers = {"Content-Type": "application/json"}

            logger.info(f"📡 Llamando a Gemini API...")
            response = requests.post(url, headers=headers, json=payload, timeout=60)

            if response.status_code == 200:
                result = response.json()
                if "candidates" in result and len(result["candidates"]) > 0:
                    candidate = result["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        for part in candidate["content"]["parts"]:
                            if "inlineData" in part:
                                return part["inlineData"]["data"]

                logger.error(f"❌ Respuesta inesperada de Gemini: {result}")
                return None
            else:
                logger.error(f"❌ Error en Gemini API: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"❌ Error generando imagen con Gemini: {e}")
            return None

    def _enhance_prompt_for_generation(self, prompt: str, character_style: str) -> str:
        """Mejora el prompt para generación de imágenes"""
        # Remover cualquier mención de diálogo o texto del prompt original
        clean_prompt = self._remove_dialogue_from_prompt(prompt)

        # Crear prompt limpio enfocado solo en la imagen visual
        enhanced_prompt = f"{clean_prompt}, high quality PNG image, professional photography, sharp details, clean composition"

        # Instrucciones muy específicas para evitar texto
        enhanced_prompt += ", ABSOLUTELY NO TEXT, NO WORDS, NO WRITING, NO SUBTITLES, NO OVERLAYS, NO CAPTIONS, NO DIALOGUE TEXT, NO SPEECH BUBBLES, NO TITLE CARDS, NO BOTTOM TEXT, NO SCREEN TEXT, NO GRAPHICS WITH TEXT, clean professional image with only the person speaking, no text elements whatsoever"

        if character_style == "realistic":
            enhanced_prompt += ", photorealistic style, natural lighting"

        return enhanced_prompt

    def _remove_dialogue_from_prompt(self, prompt: str) -> str:
        """Remueve el diálogo del prompt para evitar que se genere como texto"""
        try:
            # Remover el diálogo entre comillas
            import re
            # Buscar y remover texto entre comillas que contenga el diálogo
            dialogue_pattern = r'speaking directly to the camera in Spanish:\s*"[^"]*"'
            clean_prompt = re.sub(dialogue_pattern, 'speaking directly to the camera', prompt)

            # Remover otras menciones de diálogo
            clean_prompt = re.sub(r'Dialogue[^.]*\.', '', clean_prompt)
            clean_prompt = re.sub(r'"[^"]*"', '', clean_prompt)

            return clean_prompt.strip()
        except Exception as e:
            logger.error(f"❌ Error limpiando prompt: {e}")
            return prompt

    def _process_base64_image(self, image_base64: str) -> str:
        """Procesa imagen base64 para Gemini"""
        try:
            # Remover prefijo data: si existe
            if image_base64.startswith("data:"):
                image_base64 = image_base64.split(",")[1]

            return image_base64
        except Exception as e:
            logger.error(f"❌ Error procesando imagen base64: {e}")
            return image_base64

    def _process_image_url(self, image_url: str) -> str:
        """Procesa URL de imagen (local o remota) y la convierte a base64"""
        try:
            import base64

            # Si es una ruta local (sin http)
            if not image_url.startswith(('http://', 'https://')):
                # Es una ruta local, leer desde uploads/
                local_path = f"uploads/banana/{image_url}"
                if not os.path.exists(local_path):
                    raise FileNotFoundError(f"Imagen no encontrada: {local_path}")

                with open(local_path, 'rb') as f:
                    image_data = f.read()
                    base64_data = base64.b64encode(image_data).decode('utf-8')
                    logger.info(f"✅ Imagen local procesada: {local_path}")
                    return base64_data

            else:
                # Es una URL remota, descargar
                logger.info(f"📥 Descargando imagen remota: {image_url}")
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()

                image_data = response.content
                base64_data = base64.b64encode(image_data).decode('utf-8')
                logger.info(f"✅ Imagen remota procesada: {image_url}")
                return base64_data

        except Exception as e:
            logger.error(f"❌ Error procesando URL de imagen {image_url}: {e}")
            raise ValueError(f"Error procesando imagen: {str(e)}")

    def save_image_to_file(self, image_base64: str, file_path: str) -> bool:
        """Guarda imagen base64 en archivo PNG"""
        try:
            # Decodificar base64
            image_data = base64.b64decode(image_base64)

            # Crear directorio si no existe
            file_path_obj = Path(file_path)
            file_path_obj.parent.mkdir(parents=True, exist_ok=True)

            # Guardar archivo
            with open(file_path_obj, 'wb') as f:
                f.write(image_data)

            logger.info(f"✅ Imagen guardada: {file_path}")
            return True

        except Exception as e:
            logger.error(f"❌ Error guardando imagen: {e}")
            return False

    def generate_file_path(self, clip_number: int, image_type: str) -> str:
        """Genera ruta de archivo para imagen"""
        timestamp = int(datetime.now().timestamp())
        filename = f"clip_{clip_number}_{image_type}_{timestamp}.png"
        return f"clips/{filename}"

    def generate_correlated_images(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Genera imágenes correlacionadas desde escenas"""
        try:
            logger.info(f"🎬 Iniciando generación de imágenes correlacionadas...")

            # Extraer datos del request
            base_image_base64 = request_data.get("base_image_base64", "")
            base_image_url = request_data.get("base_image_url", "")
            scenes = request_data.get("scenes", [])
            aspect_ratio = request_data.get("aspect_ratio", "16:9")
            character_style = request_data.get("character_style", "realistic")
            temperature = request_data.get("temperature", 0.7)
            max_output_tokens = request_data.get("max_output_tokens", 2048)

            # Procesar imagen (base64 o URL)
            if base_image_base64:
                clean_base64 = self._process_base64_image(base_image_base64)
            elif base_image_url:
                clean_base64 = self._process_image_url(base_image_url)
            else:
                raise ValueError("Debe proporcionar base_image_base64 o base_image_url")

            # Generar imágenes para cada escena
            processed_scenes = []

            for scene in scenes:
                scene_index = scene.get("sceneIndex", 1)
                prompt = scene.get("prompt", "")

                logger.info(f"🎭 Procesando escena {scene_index}...")

                # Generar imagen de inicio
                start_prompt = self._create_start_prompt(prompt)
                start_image_base64 = self.generate_image_with_gemini(
                    prompt=start_prompt,
                    reference_image_base64=clean_base64,
                    aspect_ratio=aspect_ratio,
                    character_style=character_style,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens
                )

                # Generar imagen de final
                end_prompt = self._create_end_prompt(prompt)
                end_image_base64 = self.generate_image_with_gemini(
                    prompt=end_prompt,
                    reference_image_base64=clean_base64,
                    aspect_ratio=aspect_ratio,
                    character_style=character_style,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens
                )

                if start_image_base64 and end_image_base64:
                    # Generar rutas de archivo
                    start_path = self.generate_file_path(scene_index, "start")
                    end_path = self.generate_file_path(scene_index, "end")

                    # Guardar imágenes
                    start_saved = self.save_image_to_file(start_image_base64, f"uploads/{start_path}")
                    end_saved = self.save_image_to_file(end_image_base64, f"uploads/{end_path}")

                    if start_saved and end_saved:
                        # Crear escena procesada
                        processed_scene = {
                            "sceneIndex": scene_index,
                            "prompt": prompt,
                            "fileName": scene.get("fileName", ""),
                            "start_image": start_path,
                            "end_image": end_path,
                            "isFirstScene": scene.get("isFirstScene", False),
                            "negative_prompt": scene.get("negative_prompt", ""),
                            "previousSceneIndex": scene.get("previousSceneIndex", 0)
                        }

                        processed_scenes.append(processed_scene)

                        logger.info(f"✅ Escena {scene_index} procesada exitosamente")
                    else:
                        logger.error(f"❌ Error guardando imágenes para escena {scene_index}")
                else:
                    logger.error(f"❌ Error generando imágenes para escena {scene_index}")

            # Preparar respuesta
            response = {
                "success": True,
                "scenes": processed_scenes
            }

            logger.info(f"🎉 Generación completada: {len(processed_scenes)} escenas procesadas")
            return response

        except Exception as e:
            logger.error(f"❌ Error en generación de imágenes correlacionadas: {e}")
            return {
                "success": False,
                "error": str(e),
                "scenes": []
            }

    def _create_start_prompt(self, original_prompt: str) -> str:
        """Crea prompt para imagen de inicio"""
        # Limpiar el prompt removiendo diálogo
        clean_prompt = self._remove_dialogue_from_prompt(original_prompt)

        # Modificar el prompt para indicar inicio del diálogo
        start_prompt = clean_prompt.replace(
            "gradually settling by second 7",
            "about to begin speaking, preparing to start dialogue"
        )
        start_prompt = start_prompt.replace(
            "completely still with warm composed expression",
            "ready to speak, looking at camera, about to begin"
        )

        # Agregar instrucciones muy específicas para evitar texto
        start_prompt += ", ABSOLUTELY NO TEXT, NO WORDS, NO WRITING, NO SUBTITLES, NO OVERLAYS, NO CAPTIONS, NO DIALOGUE TEXT, NO SPEECH BUBBLES, NO TITLE CARDS, NO BOTTOM TEXT, NO SCREEN TEXT, NO GRAPHICS WITH TEXT, clean professional image with only the person speaking, no text elements whatsoever"

        return start_prompt

    def _create_end_prompt(self, original_prompt: str) -> str:
        """Crea prompt para imagen de final"""
        # Modificar el prompt para indicar final del diálogo
        end_prompt = original_prompt.replace(
            "gradually settling by second 7",
            "finishing speaking, concluding dialogue naturally"
        )
        end_prompt = end_prompt.replace(
            "completely still with warm composed expression",
            "finished speaking, confident smile, natural conclusion"
        )

        # Agregar instrucciones específicas para evitar texto
        end_prompt += ", NO TEXT, NO WORDS, NO WRITING, NO SUBTITLES, NO OVERLAYS, NO CAPTIONS, clean image without any text elements"

        return end_prompt
