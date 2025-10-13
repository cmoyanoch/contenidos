#!/usr/bin/env python3
"""
Alternativa temporal usando Marketing API para publicar en Facebook
Mientras se obtiene el permiso pages_manage_posts
"""

import httpx
import os
from typing import Dict, Any

class FacebookMarketingAPI:
    def __init__(self):
        self.access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')
        self.page_id = os.getenv('FACEBOOK_PAGE_ID')
        self.base_url = "https://graph.facebook.com/v24.0"

    async def create_page_post_via_marketing_api(self, message: str) -> Dict[str, Any]:
        """
        Intenta publicar usando Marketing API como alternativa
        """
        try:
            # Opción 1: Usar el endpoint de feed con parámetros adicionales
            url = f"{self.base_url}/{self.page_id}/feed"

            data = {
                "message": message,
                "access_token": self.access_token,
                "published": True,
                "formatting": "MARKDOWN"  # Intentar con formato markdown
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=data)

                if response.status_code == 200:
                    return {
                        "success": True,
                        "post_id": response.json().get("id"),
                        "method": "marketing_api_feed"
                    }
                else:
                    return {
                        "success": False,
                        "error": response.text,
                        "status_code": response.status_code
                    }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def create_page_post_via_ads_api(self, message: str) -> Dict[str, Any]:
        """
        Alternativa usando Ads API para crear contenido
        """
        try:
            # Usar Ads API para crear un post promocional
            url = f"{self.base_url}/act_{self.page_id}/ads"

            data = {
                "name": "Security Insurance Post",
                "adset_id": None,  # Necesitaría configurar un adset
                "creative": {
                    "object_story_spec": {
                        "page_id": self.page_id,
                        "link_data": {
                            "message": message,
                            "link": "https://asecurityinsurance.com"  # URL de tu sitio
                        }
                    }
                },
                "access_token": self.access_token
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=data)

                if response.status_code == 200:
                    return {
                        "success": True,
                        "ad_id": response.json().get("id"),
                        "method": "ads_api"
                    }
                else:
                    return {
                        "success": False,
                        "error": response.text,
                        "status_code": response.status_code
                    }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Función para probar las alternativas
async def test_alternatives():
    """Prueba las alternativas disponibles"""

    api = FacebookMarketingAPI()

    message = "🛡️ ¡A Security Insurance protege tu futuro! Cotiza tu seguro hoy y duerme tranquilo. #Seguros #Protección #Tranquilidad"

    print("🔍 Probando alternativas para publicar en Facebook...")

    # Probar Marketing API
    print("\n1. Probando Marketing API...")
    result1 = await api.create_page_post_via_marketing_api(message)
    print(f"Resultado: {result1}")

    # Probar Ads API (requiere configuración adicional)
    print("\n2. Probando Ads API...")
    result2 = await api.create_page_post_via_ads_api(message)
    print(f"Resultado: {result2}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_alternatives())
