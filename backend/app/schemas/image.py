
"""
Image Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator, HttpUrl, ConfigDict

# Base schemas
class ImageBase(BaseModel):
    filename: str = Field(..., min_length=1, max_length=500)
    original_filename: Optional[str] = None
    url: HttpUrl
    thumbnail_url: Optional[HttpUrl] = None
    width: Optional[int] = Field(None, ge=1)
    height: Optional[int] = Field(None, ge=1)
    file_size: Optional[int] = Field(None, ge=0)
    format: Optional[str] = None
    alt_text: Optional[str] = Field(None, max_length=500)
    caption: Optional[str] = None
    title: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    album_id: Optional[int] = None

class ImageCreate(ImageBase):
    uploaded_by_id: int

class ImageUpdate(BaseModel):
    alt_text: Optional[str] = Field(None, max_length=500)
    caption: Optional[str] = None
    title: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    album_id: Optional[int] = None

class ImageInDB(ImageBase):
    id: int
    uploaded_by_id: int
    usage_count: int = 0
    last_used: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ImageResponse(ImageInDB):
    """Response schema with additional fields"""
    uploaded_by_name: Optional[str] = None
    album_name: Optional[str] = None

# Album schemas
class ImageAlbumBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    cover_image_id: Optional[int] = None
    is_public: bool = True
    is_featured: bool = False

class ImageAlbumCreate(ImageAlbumBase):
    pass

class ImageAlbumUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    cover_image_id: Optional[int] = None
    is_public: Optional[bool] = None
    is_featured: Optional[bool] = None

class ImageAlbumInDB(ImageAlbumBase):
    id: int
    image_count: int = 0
    views: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ImageAlbumResponse(ImageAlbumInDB):
    """Response schema with cover image"""
    cover_image_url: Optional[str] = None
    images: Optional[List[ImageResponse]] = None

# Filter schemas
class ImageFilter(BaseModel):
    search: Optional[str] = None
    category: Optional[str] = None
    album_id: Optional[int] = None
    tags: Optional[List[str]] = None
    format: Optional[str] = None
    min_width: Optional[int] = None
    min_height: Optional[int] = None
    max_file_size: Optional[int] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

# Bulk operation schemas
class ImageBulkUpdate(BaseModel):
    ids: List[int]
    category: Optional[str] = None
    album_id: Optional[int] = None
    tags: Optional[List[str]] = None

class ImageBulkDelete(BaseModel):
    ids: List[int]

# Upload schemas
class ImageUploadResponse(BaseModel):
    url: str
    thumbnail_url: Optional[str] = None
    filename: str
    original_filename: str
    file_size: int
    width: int
    height: int
    format: str

class MultiImageUpload(BaseModel):
    images: List[ImageUploadResponse]
    uploaded: int
    failed: int

# Statistics
class ImageStats(BaseModel):
    total_images: int
    total_size: int
    by_category: dict
    by_format: dict
    recent_uploads: List[ImageResponse]