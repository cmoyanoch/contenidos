from fastapi import APIRouter, HTTPException
from models.social_models import PostRequest, PostResponse
from services.instagram_service import InstagramService

router = APIRouter()
instagram_service = InstagramService()

@router.post("/publish", response_model=PostResponse)
async def publish_to_instagram(post: PostRequest):
    try:
        result = await instagram_service.publish_content(post)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-container")
async def create_container(post: PostRequest):
    try:
        container_id = await instagram_service.create_container(post)
        return {"container_id": container_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/publish-container/{container_id}")
async def publish_container(container_id: str):
    try:
        result = await instagram_service.publish_container(container_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))