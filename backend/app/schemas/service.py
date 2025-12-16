
"""
Service Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator, HttpUrl, ConfigDict

# Base schemas
class ServiceBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    slug: str = Field(..., min_length=1, max_length=500)
    excerpt: Optional[str] = None
    description: str
    icon: Optional[str] = None
    image_url: Optional[HttpUrl] = None
    color: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    duration: Optional[str] = None
    success_rate: Optional[float] = Field(None, ge=0, le=100)
    features: List[str] = []
    benefits: Optional[List[str]] = None
    process: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    status: str = "active"
    is_featured: bool = False
    is_popular: bool = False
    position: int = 0
    category_id: Optional[int] = None
    seo_title: Optional[str] = Field(None, max_length=500)
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = Field(None, max_length=500)

    @validator('slug')
    def validate_slug(cls, v):
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Slug can only contain alphanumeric characters, hyphens, and underscores')
        return v.lower()

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    slug: Optional[str] = Field(None, min_length=1, max_length=500)
    excerpt: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[HttpUrl] = None
    color: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    duration: Optional[str] = None
    success_rate: Optional[float] = Field(None, ge=0, le=100)
    features: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    process: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_popular: Optional[bool] = None
    position: Optional[int] = None
    category_id: Optional[int] = None
    seo_title: Optional[str] = Field(None, max_length=500)
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = Field(None, max_length=500)

class ServiceInDB(ServiceBase):
    id: int
    views: int = 0
    inquiries: int = 0
    order_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ServiceResponse(ServiceInDB):
    """Response schema with additional fields"""
    category_name: Optional[str] = None
    category_slug: Optional[str] = None

# Category schemas
class ServiceCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    position: int = 0
    seo_title: Optional[str] = Field(None, max_length=200)
    seo_description: Optional[str] = None

class ServiceCategoryCreate(ServiceCategoryBase):
    pass

class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    position: Optional[int] = None
    seo_title: Optional[str] = Field(None, max_length=200)
    seo_description: Optional[str] = None

class ServiceCategoryInDB(ServiceCategoryBase):
    id: int
    service_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ServiceCategoryResponse(ServiceCategoryInDB):
    """Response schema with services"""
    services: Optional[List[ServiceResponse]] = None

# Filter schemas
class ServiceFilter(BaseModel):
    search: Optional[str] = None
    category_id: Optional[int] = None
    category_slug: Optional[str] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_popular: Optional[bool] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

# Bulk operation schemas
class ServiceBulkUpdate(BaseModel):
    ids: List[int]
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_popular: Optional[bool] = None
    category_id: Optional[int] = None

class ServiceBulkDelete(BaseModel):
    ids: List[int]

class ServiceReorder(BaseModel):
    order: List[dict]  # List of {id: int, position: int}

# Statistics
class ServiceStats(BaseModel):
    total_services: int
    active_services: int
    featured_services: int
    total_categories: int
    total_views: int
    total_inquiries: int
    avg_price: Optional[float] = None
    by_category: dict
    recent_services: List[ServiceResponse]