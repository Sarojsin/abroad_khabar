"""
Blog Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

class BlogStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class BlogBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: str = ""
    featured_image: Optional[str] = None
    status: BlogStatus = BlogStatus.DRAFT
    category_id: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    tags: Optional[List[str]] = None

class BlogCreate(BlogBase):
    pass

class BlogUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    status: Optional[BlogStatus] = None
    category_id: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    tags: Optional[List[str]] = None

class BlogResponse(BlogBase):
    id: int
    author_id: int
    views: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class BlogBulkUpdate(BaseModel):
    ids: List[int]
    status: Optional[BlogStatus] = None
    category_id: Optional[int] = None

class BlogBulkDelete(BaseModel):
    ids: List[int]
