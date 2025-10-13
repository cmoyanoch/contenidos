import httpx
import os
from models.social_models import PostRequest, PostResponse, PlatformType

class LinkedInService:
    def __init__(self):
        self.access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
        self.person_id = os.getenv("LINKEDIN_PERSON_ID")
        self.base_url = "https://api.linkedin.com/v2"

    async def publish_content(self, post: PostRequest) -> PostResponse:
        try:
            if post.media_url:
                asset_id = await self.upload_asset(post.media_url)
                return await self.create_post(post, asset_id)
            else:
                return await self.create_post(post)
        except Exception as e:
            return PostResponse(
                success=False,
                platform=PlatformType.LINKEDIN,
                message="Failed to publish post",
                error=str(e)
            )

    async def upload_asset(self, file_url: str) -> str:
        register_url = f"{self.base_url}/assets?action=registerUpload"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        register_data = {
            "registerUploadRequest": {
                "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                "owner": f"urn:li:person:{self.person_id}",
                "serviceRelationships": [
                    {
                        "relationshipType": "OWNER",
                        "identifier": "urn:li:userGeneratedContent"
                    }
                ]
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(register_url, json=register_data, headers=headers)
            response.raise_for_status()
            result = response.json()

            upload_url = result["value"]["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
            asset_id = result["value"]["asset"]

            media_response = await client.get(file_url)
            media_response.raise_for_status()

            upload_response = await client.put(upload_url, content=media_response.content)
            upload_response.raise_for_status()

            return asset_id

    async def create_post(self, post: PostRequest, asset_id: str = None) -> PostResponse:
        url = f"{self.base_url}/ugcPosts"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        ugc_data = {
            "author": f"urn:li:person:{self.person_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": post.content
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }

        if asset_id:
            ugc_data["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
            ugc_data["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
                {
                    "status": "READY",
                    "description": {
                        "text": post.content
                    },
                    "media": asset_id,
                    "title": {
                        "text": "Shared content"
                    }
                }
            ]

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=ugc_data, headers=headers)
                response.raise_for_status()
                result = response.json()

                return PostResponse(
                    success=True,
                    platform=PlatformType.LINKEDIN,
                    post_id=result.get("id"),
                    message="Post published successfully"
                )
            except Exception as e:
                return PostResponse(
                    success=False,
                    platform=PlatformType.LINKEDIN,
                    message="Failed to create post",
                    error=str(e)
                )