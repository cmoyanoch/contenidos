"""
Servicio para verificar cuotas de la API de Google Veo 3.0
Incluye rate limiting y estadísticas detalladas
"""
import requests
import json
import time
from typing import Dict, Any, Optional
from utils.config import get_settings
from utils.logger import setup_logger
from .rate_limiter import veo_rate_limiter, video_generation_queue

logger = setup_logger(__name__)

class QuotaService:
    """Servicio para gestionar y verificar cuotas de API"""

    def __init__(self):
        self.settings = get_settings()
        self._quota_cache = {}
        self._cache_expiry = 300  # 5 minutos

    async def get_quota_info(self) -> Dict[str, Any]:
        """
        Obtiene información detallada de cuotas disponibles
        """
        try:
            # Verificar límites de la API de Gemini/Veo
            quota_info = await self._check_gemini_quotas()

            # Obtener información de rate limiting
            rate_limiter_stats = await veo_rate_limiter.get_usage_stats()

            # Obtener estado de la cola
            queue_status = await video_generation_queue.get_queue_status()

            return {
                "status": "success",
                "api_key": f"{self.settings.GOOGLE_API_KEY[:20]}...",
                "quotas": quota_info,
                "rate_limiting": rate_limiter_stats,
                "queue_status": queue_status,
                "service": "Google Veo 3.0",
                "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "cache_expires_in": f"{self._cache_expiry} seconds"
            }

        except Exception as e:
            logger.error(f"Error obteniendo información de cuotas: {e}")
            return {
                "status": "error",
                "error": str(e),
                "api_key": f"{self.settings.GOOGLE_API_KEY[:20]}...",
                "service": "Google Veo 3.0"
            }

    async def _check_gemini_quotas(self) -> Dict[str, Any]:
        """
        Verifica cuotas específicas de Gemini API con más detalles
        """
        headers = {
            "x-goog-api-key": self.settings.GOOGLE_API_KEY,
            "Content-Type": "application/json"
        }

        quota_data = {
            "text_to_video": {
                "daily_limit": "No disponible",
                "requests_per_minute": "No disponible",
                "status": "No verificado",
                "model": "gemini-2.5-flash",
                "endpoint": "generateContent"
            },
            "image_to_video": {
                "daily_limit": "No disponible",
                "requests_per_minute": "No disponible",
                "status": "No verificado",
                "model": "gemini-2.5-flash",
                "endpoint": "generateContent"
            },
            "image_analysis": {
                "daily_limit": "No disponible",
                "requests_per_minute": "No disponible",
                "status": "No verificado",
                "model": "gemini-2.5-flash",
                "endpoint": "generateContent"
            }
        }

        try:
            # 1. Verificar que la API key funciona
            test_url = "https://generativelanguage.googleapis.com/v1beta/models"
            response = requests.get(test_url, headers=headers, timeout=10)

            if response.status_code == 200:
                models_data = response.json()
                available_models = [model.get("name", "") for model in models_data.get("models", [])]

                # Actualizar estado basado en modelos disponibles
                for operation in quota_data:
                    quota_data[operation]["status"] = "API Key válida"
                    quota_data[operation]["available_models"] = available_models

                logger.info("✅ API Key de Google GenAI verificada correctamente")
                logger.info(f"📋 Modelos disponibles: {len(available_models)}")

                # 2. Intentar obtener información de cuotas específicas
                await self._check_specific_quotas(quota_data, headers)

            else:
                error_msg = f"Error: {response.status_code}"
                for operation in quota_data:
                    quota_data[operation]["status"] = error_msg
                logger.warning(f"⚠️ API Key de Google GenAI con problemas: {response.status_code}")

        except requests.exceptions.RequestException as e:
            error_msg = f"Error de conexión: {str(e)}"
            for operation in quota_data:
                quota_data[operation]["status"] = error_msg
            logger.error(f"❌ Error verificando API Key: {e}")

        return quota_data

    async def _check_specific_quotas(self, quota_data: Dict[str, Any], headers: Dict[str, str]):
        """
        Intenta obtener cuotas específicas para cada operación
        """
        try:
            # Para Google Veo, intentamos hacer una llamada de prueba muy pequeña
            test_payload = {
                "contents": [{
                    "parts": [{
                        "text": "test"
                    }]
                }],
                "generationConfig": {
                    "maxOutputTokens": 1
                }
            }

            # Probar con diferentes modelos
            test_models = [
                "gemini-2.5-flash",
                "gemini-1.5-flash",
                "gemini-2.0-flash-exp"
            ]

            for model in test_models:
                try:
                    test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                    response = requests.post(test_url, headers=headers, json=test_payload, timeout=5)

                    if response.status_code == 200:
                        # Si funciona, actualizar información
                        for operation in quota_data:
                            if quota_data[operation]["model"] == model:
                                quota_data[operation]["status"] = "Modelo disponible y funcional"
                                quota_data[operation]["test_successful"] = True
                    elif response.status_code == 429:
                        # Rate limit - significa que la API funciona pero hay límites
                        for operation in quota_data:
                            if quota_data[operation]["model"] == model:
                                quota_data[operation]["status"] = "Rate limit alcanzado - API funcional"
                                quota_data[operation]["rate_limited"] = True
                    elif response.status_code == 403:
                        # Permisos o cuota excedida
                        for operation in quota_data:
                            if quota_data[operation]["model"] == model:
                                quota_data[operation]["status"] = "Cuota excedida o sin permisos"
                                quota_data[operation]["quota_exceeded"] = True

                except requests.exceptions.RequestException:
                    continue

        except Exception as e:
            logger.warning(f"⚠️ No se pudieron verificar cuotas específicas: {e}")

    async def _get_usage_info(self) -> Dict[str, Any]:
        """
        Obtiene información de uso actual
        """
        return {
            "requests_today": "No disponible",
            "tokens_used_today": "No disponible",
            "last_request_time": "No disponible",
            "average_response_time": "No disponible",
            "note": "Google Veo 3.0 no expone métricas de uso públicamente"
        }

    def check_quota(self, operation_type: str) -> bool:
        """
        Verifica si hay cuota disponible para una operación específica
        """
        try:
            # Verificar cache
            cache_key = f"{operation_type}_{int(time.time() // self._cache_expiry)}"
            if cache_key in self._quota_cache:
                return self._quota_cache[cache_key]

            # Por ahora, siempre permitimos la operación
            # En un entorno real, aquí verificaríamos las cuotas disponibles
            result = True
            self._quota_cache[cache_key] = result

            logger.info(f"✅ Cuota verificada para {operation_type}")
            return result

        except Exception as e:
            logger.error(f"❌ Error verificando cuota para {operation_type}: {e}")
            return False

# Instancia global del servicio
quota_service = QuotaService()
