from fastapi import APIRouter, HTTPException
from models.social_models import PostRequest, PostResponse
from services.facebook_service import FacebookService

router = APIRouter()
facebook_service = FacebookService()

@router.post("/publish", response_model=PostResponse)
async def publish_to_facebook(post: PostRequest):
    try:
        result = await facebook_service.publish_content(post)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/publish-feed")
async def publish_feed(post: PostRequest):
    try:
        result = await facebook_service.publish_feed(post)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/publish-story")
async def publish_story(post: PostRequest):
    try:
        result = await facebook_service.publish_story(post)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))