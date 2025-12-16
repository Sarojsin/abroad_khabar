"""
Advertisement Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator, HttpUrl, ConfigDict
from enum import Enum

class AdType(str, Enum):
    BANNER = "banner"
    SIDEBAR = "sidebar"
    VIDEO = "video"
    POPUP = "popup"
    INLINE = "inline"

class AdStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"

class AdPosition(str, Enum):
    HEADER = "header"
    SIDEBAR = "sidebar"
    FOOTER = "footer"
    INLINE = "inline"
    POPUP = "popup"

# Base schemas
class AdBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    ad_type: AdType = AdType.BANNER
    position: AdPosition
    image_url: Optional[HttpUrl] = None
    video_url: Optional[HttpUrl] = None
    url: HttpUrl
    start_date: datetime
    end_date: Optional[datetime] = None
    status: AdStatus = AdStatus.DRAFT
    pages: Optional[List[str]] = None
    countries: Optional[List[str]] = None
    devices: Optional[List[str]] = None
    max_impressions: Optional[int] = Field(None, ge=1)
    max_clicks: Optional[int] = Field(None, ge=1)
    daily_budget: Optional[int] = Field(None, ge=0)

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

class AdCreate(AdBase):
    created_by_id: int

class AdUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    ad_type: Optional[AdType] = None
    position: Optional[AdPosition] = None
    image_url: Optional[HttpUrl] = None
    video_url: Optional[HttpUrl] = None
    url: Optional[HttpUrl] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[AdStatus] = None
    pages: Optional[List[str]] = None
    countries: Optional[List[str]] = None
    devices: Optional[List[str]] = None
    max_impressions: Optional[int] = Field(None, ge=1)
    max_clicks: Optional[int] = Field(None, ge=1)
    daily_budget: Optional[int] = Field(None, ge=0)

class AdInDB(AdBase):
    id: int
    created_by_id: int
    impressions: int = 0
    clicks: int = 0
    ctr: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

class AdResponse(AdInDB):
    """Response schema with additional fields"""
    created_by_name: Optional[str] = None
    is_active: bool = Field(default=False)
    
    @validator('is_active', always=True)
    def check_active_status(cls, v, values):
        if 'status' not in values or 'start_date' not in values:
            return False
        
        now = datetime.utcnow()
        is_active = (
            values['status'] == AdStatus.ACTIVE and
            values['start_date'] <= now and
            (values['end_date'] is None or values['end_date'] >= now)
        )
        return is_active

# Filter schemas
class AdFilter(BaseModel):
    search: Optional[str] = None
    ad_type: Optional[AdType] = None
    position: Optional[AdPosition] = None
    status: Optional[AdStatus] = None
    page: Optional[str] = None
    country: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    is_active: Optional[bool] = None

# Bulk operation schemas
class AdBulkUpdate(BaseModel):
    ids: List[int]
    status: Optional[AdStatus] = None
    position: Optional[AdPosition] = None

class AdBulkDelete(BaseModel):
    ids: List[int]

# Statistics schemas
class AdStats(BaseModel):
    total_ads: int
    active_ads: int
    paused_ads: int
    draft_ads: int
    total_impressions: int
    total_clicks: int
    overall_ctr: float
    by_type: dict
    by_position: dict
    by_status: dict

class DailyAdStats(BaseModel):
    date: datetime
    impressions: int
    clicks: int
    ctr: float

class AdDetailedStats(AdStats):
    daily_stats: List[DailyAdStats]
    top_performing: List[AdResponse]
    recent_activity: List[dict]

# Click tracking
class AdClick(BaseModel):
    ad_id: int
    ip_address: str
    user_agent: Optional[str] = None
    referrer: Optional[str] = None
    page_url: str

# Impression tracking
class AdImpression(BaseModel):
    ad_id: int
    ip_address: str
    user_agent: Optional[str] = None
    page_url: str