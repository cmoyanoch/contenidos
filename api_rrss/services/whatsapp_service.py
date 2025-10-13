import httpx
import os
from models.social_models import PostRequest, PostResponse, PlatformType

class WhatsAppService:
    def __init__(self):
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        self.base_url = "https://graph.facebook.com/v18.0"

    async def send_template(self, template_name: str, phone_number: str, parameters: list = []) -> dict:
        url = f"{self.base_url}/{self.phone_number_id}/messages"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        data = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": "es"
                }
            }
        }

        if parameters:
            data["template"]["components"] = [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": param} for param in parameters]
                }
            ]

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=data, headers=headers)
                response.raise_for_status()
                result = response.json()

                return {
                    "success": True,
                    "message_id": result.get("messages", [{}])[0].get("id"),
                    "message": "Template sent successfully"
                }
            except Exception as e:
                return {
                    "success": False,
                    "message": "Failed to send template",
                    "error": str(e)
                }

    async def broadcast_message(self, post: PostRequest, phone_numbers: list) -> PostResponse:
        results = []

        for phone_number in phone_numbers:
            result = await self.send_template("approved_template", phone_number, [post.content])
            results.append(result)

        success_count = sum(1 for r in results if r.get("success"))

        return PostResponse(
            success=success_count > 0,
            platform=PlatformType.WHATSAPP,
            message=f"Broadcast sent to {success_count}/{len(phone_numbers)} contacts",
            post_id=f"broadcast_{len(results)}"
        )

    async def get_approved_templates(self) -> list:
        business_account_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
        url = f"{self.base_url}/{business_account_id}/message_templates"

        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        params = {
            "status": "APPROVED"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                result = response.json()

                return result.get("data", [])
            except Exception as e:
                return []