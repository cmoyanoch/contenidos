from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class PlatformType(str, Enum):
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    WHATSAPP = "whatsapp"

class ContentType(str, Enum):
    FEED = "feed"
    REEL = "reel"
    STORY = "story"
    MESSAGE = "message"

class PostRequest(BaseModel):
    content: str
    platform: PlatformType
    content_type: ContentType
    media_url: Optional[str] = None
    scheduled_time: Optional[str] = None

class PostResponse(BaseModel):
    success: bool
    platform: PlatformType
    post_id: Optional[str] = None
    message: str
    error: Optional[str] = None

class MultiPostRequest(BaseModel):
    content: str
    platforms: List[PlatformType]
    content_type: ContentType
    media_url: Optional[str] = None
    scheduled_time: Optional[str] = None

class PlatformConfig(BaseModel):
    platform: PlatformType
    access_token: str
    page_id: Optional[str] = None
    account_id: Optional[str] = None