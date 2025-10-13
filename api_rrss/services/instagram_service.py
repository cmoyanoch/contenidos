import httpx
import os
from models.social_models import PostRequest, PostResponse, PlatformType, ContentType

class InstagramService:
    def __init__(self):
        self.access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
        self.account_id = os.getenv("INSTAGRAM_ACCOUNT_ID")
        self.base_url = "https://graph.facebook.com/v18.0"

    async def publish_content(self, post: PostRequest) -> PostResponse:
        if post.content_type == ContentType.FEED:
            return await self.publish_feed(post)
        elif post.content_type == ContentType.REEL:
            return await self.publish_reel(post)
        else:
            return PostResponse(
                success=False,
                platform=PlatformType.INSTAGRAM,
                message="Unsupported content type",
                error="Only feed and reel are supported"
            )

    async def create_container(self, post: PostRequest) -> str:
        url = f"{self.base_url}/{self.account_id}/media"

        data = {
            "caption": post.content,
            "access_token": self.access_token
        }

        if post.content_type == ContentType.REEL:
            data["media_type"] = "REELS"
            data["video_url"] = post.media_url
        else:
            data["image_url"] = post.media_url

        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            result = response.json()
            return result["id"]

    async def publish_container(self, container_id: str) -> PostResponse:
        url = f"{self.base_url}/{self.account_id}/media_publish"

        data = {
            "creation_id": container_id,
            "access_token": self.access_token
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, data=data)
                response.raise_for_status()
                result = response.json()

                return PostResponse(
                    success=True,
                    platform=PlatformType.INSTAGRAM,
                    post_id=result.get("id"),
                    message="Published successfully"
                )
            except Exception as e:
                return PostResponse(
                    success=False,
                    platform=PlatformType.INSTAGRAM,
                    message="Failed to publish",
                    error=str(e)
                )

    async def publish_feed(self, post: PostRequest) -> PostResponse:
        try:
            container_id = await self.create_container(post)
            return await self.publish_container(container_id)
        except Exception as e:
            return PostResponse(
                success=False,
                platform=PlatformType.INSTAGRAM,
                message="Failed to publish feed",
                error=str(e)
            )

    async def publish_reel(self, post: PostRequest) -> PostResponse:
        try:
            container_id = await self.create_container(post)
            return await self.publish_container(container_id)
        except Exception as e:
            return PostResponse(
                success=False,
                platform=PlatformType.INSTAGRAM,
                message="Failed to publish reel",
                error=str(e)
            )