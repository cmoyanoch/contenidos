import httpx
import os
from models.social_models import PostRequest, PostResponse, PlatformType, ContentType

class FacebookService:
    def __init__(self):
        self.access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
        self.page_id = os.getenv("FACEBOOK_PAGE_ID")
        self.base_url = "https://graph.facebook.com/v18.0"

    async def publish_content(self, post: PostRequest) -> PostResponse:
        if post.content_type == ContentType.FEED:
            return await self.publish_feed(post)
        elif post.content_type == ContentType.STORY:
            return await self.publish_story(post)
        else:
            return PostResponse(
                success=False,
                platform=PlatformType.FACEBOOK,
                message="Unsupported content type",
                error="Only feed and story are supported"
            )

    async def publish_feed(self, post: PostRequest) -> PostResponse:
        url = f"{self.base_url}/{self.page_id}/feed"

        data = {
            "message": post.content,
            "access_token": self.access_token
        }

        if post.media_url:
            data["link"] = post.media_url

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, data=data)
                response.raise_for_status()
                result = response.json()

                return PostResponse(
                    success=True,
                    platform=PlatformType.FACEBOOK,
                    post_id=result.get("id"),
                    message="Post published successfully"
                )
            except Exception as e:
                return PostResponse(
                    success=False,
                    platform=PlatformType.FACEBOOK,
                    message="Failed to publish post",
                    error=str(e)
                )

    async def publish_story(self, post: PostRequest) -> PostResponse:
        url = f"{self.base_url}/{self.page_id}/photos"

        data = {
            "caption": post.content,
            "url": post.media_url,
            "published": "false",
            "temporary": "true",
            "access_token": self.access_token
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, data=data)
                response.raise_for_status()
                result = response.json()

                return PostResponse(
                    success=True,
                    platform=PlatformType.FACEBOOK,
                    post_id=result.get("id"),
                    message="Story published successfully"
                )
            except Exception as e:
                return PostResponse(
                    success=False,
                    platform=PlatformType.FACEBOOK,
                    message="Failed to publish story",
                    error=str(e)
                )