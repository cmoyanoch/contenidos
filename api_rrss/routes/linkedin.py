from fastapi import APIRouter, HTTPException
from models.social_models import PostRequest, PostResponse
from services.linkedin_service import LinkedInService

router = APIRouter()
linkedin_service = LinkedInService()

@router.post("/publish", response_model=PostResponse)
async def publish_to_linkedin(post: PostRequest):
    try:
        result = await linkedin_service.publish_content(post)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-asset")
async def upload_asset(file_url: str):
    try:
        asset_id = await linkedin_service.upload_asset(file_url)
        return {"asset_id": asset_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-post")
async def create_post(post: PostRequest, asset_id: str = None):
    try:
        result = await linkedin_service.create_post(post, asset_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))