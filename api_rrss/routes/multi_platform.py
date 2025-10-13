from fastapi import APIRouter, HTTPException
from models.social_models import MultiPostRequest, PostResponse, PostRequest, PlatformType
from services.instagram_service import InstagramService
from services.linkedin_service import LinkedInService
from services.facebook_service import FacebookService
from services.whatsapp_service import WhatsAppService
import asyncio

router = APIRouter()

services = {
    PlatformType.INSTAGRAM: InstagramService(),
    PlatformType.LINKEDIN: LinkedInService(),
    PlatformType.FACEBOOK: FacebookService(),
    PlatformType.WHATSAPP: WhatsAppService()
}

@router.post("/publish-multi")
async def publish_multi_platform(multi_post: MultiPostRequest):
    results = []

    async def publish_to_platform(platform: PlatformType):
        service = services[platform]
        post_request = PostRequest(
            content=multi_post.content,
            platform=platform,
            content_type=multi_post.content_type,
            media_url=multi_post.media_url,
            scheduled_time=multi_post.scheduled_time
        )

        try:
            if platform == PlatformType.WHATSAPP:
                phone_numbers = ["1234567890"]
                return await service.broadcast_message(post_request, phone_numbers)
            else:
                return await service.publish_content(post_request)
        except Exception as e:
            return PostResponse(
                success=False,
                platform=platform,
                message="Failed to publish",
                error=str(e)
            )

    tasks = [publish_to_platform(platform) for platform in multi_post.platforms]
    results = await asyncio.gather(*tasks)

    return {
        "multi_post_id": f"multi_{len(results)}",
        "results": results,
        "success_count": sum(1 for r in results if r.success),
        "total_platforms": len(multi_post.platforms)
    }