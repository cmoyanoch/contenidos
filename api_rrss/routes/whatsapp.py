from fastapi import APIRouter, HTTPException
from models.social_models import PostRequest, PostResponse
from services.whatsapp_service import WhatsAppService

router = APIRouter()
whatsapp_service = WhatsAppService()

@router.post("/send-template")
async def send_template(template_name: str, phone_number: str, parameters: list = []):
    try:
        result = await whatsapp_service.send_template(template_name, phone_number, parameters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcast")
async def broadcast_message(post: PostRequest, phone_numbers: list):
    try:
        result = await whatsapp_service.broadcast_message(post, phone_numbers)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_templates():
    try:
        templates = await whatsapp_service.get_approved_templates()
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))