
"""
Video Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator, HttpUrl, ConfigDict
from enum import Enum

class VideoType(str, Enum):
    SELF_HOSTED = "self_hosted"
    YOUTUBE = "youtube"
    VIMEO = "vimeo"
    DAILYMOTION = "dailymotion"

class VideoStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

# Base schemas
class VideoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    video_type: VideoType = VideoType.SELF_HOSTED
    video_url: Optional[HttpUrl] = None
    embed_url: Optional[HttpUrl] = None
    thumbnail_url: Optional[HttpUrl] = None
    duration: Optional[float] = Field(None, ge=0)
    file_size: Optional[int] = Field(None, ge=0)
    resolution: Optional[str] = None
    format: Optional[str] = None
    status: VideoStatus = VideoStatus.DRAFT
    is_featured: bool = False
    allow_comments: bool = True
    allow_download: bool = False
    autoplay: bool = False
    loop: bool = False
    muted: bool = False
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    service_id: Optional[int] = None
    country: Optional[str] = None
    seo_title: Optional[str] = Field(None, max_length=500)
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = Field(None, max_length=500)

    class Config:
        use_enum_values = True

class VideoCreate(VideoBase):
    uploaded_by_id: int

class VideoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    video_type: Optional[VideoType] = None
    video_url: Optional[HttpUrl] = None
    embed_url: Optional[HttpUrl] = None
    thumbnail_url: Optional[HttpUrl] = None
    duration: Optional[float] = Field(None, ge=0)
    status: Optional[VideoStatus] = None
    is_featured: Optional[bool] = None
    allow_comments: Optional[bool] = None
    allow_download: Optional[bool] = None
    autoplay: Optional[bool] = None
    loop: Optional[bool] = None
    muted: Optional[bool] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    service_id: Optional[int] = None
    country: Optional[str] = None
    seo_title: Optional[str] = Field(None, max_length=500)
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = Field(None, max_length=500)

class VideoInDB(VideoBase):
    id: int
    uploaded_by_id: int
    views: int = 0
    likes: int = 0
    shares: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class VideoResponse(VideoInDB):
    """Response schema with additional fields"""
    uploaded_by_name: Optional[str] = None
    service_title: Optional[str] = None

# Filter schemas
class VideoFilter(BaseModel):
    search: Optional[str] = None
    category: Optional[str] = None
    service_id: Optional[int] = None
    country: Optional[str] = None
    status: Optional[VideoStatus] = None
    is_featured: Optional[bool] = None
    video_type: Optional[VideoType] = None
    tags: Optional[List[str]] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

# Bulk operation schemas
class VideoBulkUpdate(BaseModel):
    ids: List[int]
    status: Optional[VideoStatus] = None
    is_featured: Optional[bool] = None
    category: Optional[str] = None

class VideoBulkDelete(BaseModel):
    ids: List[int]

# Statistics
class VideoStats(BaseModel):
    total_videos: int
    published_videos: int
    total_views: int
    average_views: float
    by_category: dict
    by_country: dict
    by_status: dict