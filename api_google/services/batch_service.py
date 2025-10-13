"""
Servicio para procesamiento batch de análisis de imágenes
Utiliza Google Batch API para análisis masivo de imágenes
"""
import asyncio
import uuid
import requests
import time
from datetime import datetime
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from models.schemas import (
    BatchImageAnalysisRequest,
    BatchImageAnalysisResponse,
    BatchImageAnalysisItem,
    BatchImageAnalysisItemResult
)
from utils.config import get_settings
from utils.logger import setup_logger
from services.circuit_breaker import veo_circuit_breaker

logger = setup_logger(__name__)

class BatchImageAnalysisService:
    """Servicio para análisis batch de imágenes usando Gemini API"""

    def __init__(self):
        self.settings = get_settings()

    def _clean_base64(self, image_data: str) -> str:
        """Limpia datos base64 removiendo prefijos"""
        import re

        # Detectar patrón data:mime/type;base64,
        data_url_pattern = r'^data:([^;]+);base64,(.+)$'
        match = re.match(data_url_pattern, image_data)

        if match:
            return match.group(2)

        # Remover prefijo base64, si existe
        if image_data.startswith('base64,'):
            return image_data[7:]

        # Remover whitespace
        return ''.join(image_data.split())

    def _create_gemini_request(self, item: BatchImageAnalysisItem, config: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un request individual para Gemini API"""
        clean_base64 = self._clean_base64(item.image_base64)

        return {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": item.prompt},
                        {
                            "inlineData": {
                                "mimeType": item.content_type,
                                "data": clean_base64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": config.get("temperature", 0.7),
                "maxOutputTokens": config.get("max_output_tokens", 2048)
            }
        }

    def _process_single_image(self, item: BatchImageAnalysisItem, index: int, config: Dict[str, Any]) -> BatchImageAnalysisItemResult:
        """Procesa una imagen individual"""
        try:
            # Verificar circuit breaker
            if veo_circuit_breaker.state.value != "closed":
                return BatchImageAnalysisItemResult(
                    index=index,
                    success=False,
                    error="Circuit breaker abierto - servicio temporalmente no disponible",
                    metadata=item.metadata
                )

            # Crear payload para Gemini
            payload = self._create_gemini_request(item, config)

            # Headers
            headers = {
                "x-goog-api-key": self.settings.GOOGLE_API_KEY,
                "Content-Type": "application/json"
            }

            # Llamada a Gemini API
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent"

            response = requests.post(url, headers=headers, json=payload, timeout=30)

            if response.status_code == 200:
                result = response.json()

                # Extraer texto de respuesta
                analysis = ""
                tokens_used = 0

                if "candidates" in result and result["candidates"]:
                    candidate = result["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        for part in candidate["content"]["parts"]:
                            if "text" in part:
                                analysis += part["text"]

                # Extraer usage metadata
                if "usageMetadata" in result:
                    tokens_used = result["usageMetadata"].get("totalTokenCount", 0)

                return BatchImageAnalysisItemResult(
                    index=index,
                    success=True,
                    analysis=analysis,
                    metadata=item.metadata,
                    tokens_used=tokens_used
                )
            else:
                error_msg = f"API Error {response.status_code}: {response.text}"
                logger.error(f"Error en análisis imagen {index}: {error_msg}")

                return BatchImageAnalysisItemResult(
                    index=index,
                    success=False,
                    error=error_msg,
                    metadata=item.metadata
                )

        except Exception as e:
            error_msg = f"Exception: {str(e)}"
            logger.error(f"Error procesando imagen {index}: {error_msg}")

            return BatchImageAnalysisItemResult(
                index=index,
                success=False,
                error=error_msg,
                metadata=item.metadata
            )

    async def process_batch_analysis(self, request: BatchImageAnalysisRequest) -> BatchImageAnalysisResponse:
        """Procesa un batch de análisis de imágenes"""
        batch_id = str(uuid.uuid4())
        start_time = datetime.now()

        logger.info(f"🔄 Iniciando batch analysis {batch_id} con {len(request.items)} imágenes")

        # Configuración
        config = {
            "temperature": request.temperature,
            "max_output_tokens": request.max_output_tokens
        }

        # Procesar imágenes en paralelo (limitado por rate limits)
        results = []
        total_tokens = 0

        # Usar ThreadPoolExecutor para paralelismo controlado
        max_workers = min(3, len(request.items))  # Máximo 3 workers para respetar rate limits

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Enviar todas las tareas
            future_to_index = {
                executor.submit(self._process_single_image, item, i, config): i
                for i, item in enumerate(request.items)
            }

            # Recoger resultados conforme se completan
            for future in as_completed(future_to_index):
                try:
                    result = future.result()
                    results.append(result)

                    if result.tokens_used:
                        total_tokens += result.tokens_used

                    # Rate limiting básico
                    if len(results) < len(request.items):
                        await asyncio.sleep(0.5)  # Pequeña pausa entre requests

                except Exception as e:
                    index = future_to_index[future]
                    logger.error(f"Error en future para imagen {index}: {e}")
                    results.append(BatchImageAnalysisItemResult(
                        index=index,
                        success=False,
                        error=f"Processing error: {str(e)}",
                        metadata=request.items[index].metadata if index < len(request.items) else {}
                    ))

        # Ordenar resultados por índice
        results.sort(key=lambda x: x.index)

        # Calcular estadísticas
        successful_items = sum(1 for r in results if r.success)
        failed_items = len(results) - successful_items

        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()

        logger.info(f"✅ Batch {batch_id} completado: {successful_items} exitosos, {failed_items} fallidos")

        return BatchImageAnalysisResponse(
            batch_id=batch_id,
            batch_name=request.batch_name,
            total_items=len(request.items),
            successful_items=successful_items,
            failed_items=failed_items,
            results=results,
            processing_time_seconds=processing_time,
            total_tokens_used=total_tokens,
            started_at=start_time,
            completed_at=end_time
        )

# Instancia singleton
batch_service = BatchImageAnalysisService()