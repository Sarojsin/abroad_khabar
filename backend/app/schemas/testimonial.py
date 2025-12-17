from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TestimonialBase(BaseModel):
    name: str
    role: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    rating: float = 5.0
    is_approved: bool = False
    is_featured: bool = False

class TestimonialCreate(TestimonialBase):
    pass

class TestimonialUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    is_approved: Optional[bool] = None
    is_featured: Optional[bool] = None

class TestimonialInDB(TestimonialBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TestimonialResponse(TestimonialInDB):
    pass
