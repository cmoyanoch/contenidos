"""
Validación simple de Google API Key
Reemplaza el SDK complejo con validación básica
"""
from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class GoogleGenAIAuth:
    """Validación simple de API Key para Gemini API"""

    def __init__(self):
        self.settings = get_settings()

    def is_authenticated(self) -> bool:
        """Verifica si la API key está configurada"""
        return bool(self.settings.GOOGLE_API_KEY and
                   self.settings.GOOGLE_API_KEY != "your-api-key-here")

    def setup_authentication(self) -> bool:
        """Setup simplificado - solo verifica API key"""
        if self.is_authenticated():
            logger.info("✅ Google API Key configurada")
            return True
        else:
            logger.warning("⚠️ Google API Key no configurada")
            return False

    def get_quota_info(self) -> dict:
        """Información básica de configuración"""
        return {
            "api_key_configured": self.is_authenticated(),
            "api_type": "Gemini API (HTTP directo)"
        }

# Instancia global
google_genai_auth = GoogleGenAIAuth()