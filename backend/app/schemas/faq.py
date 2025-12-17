from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class FAQBase(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None
    is_active: bool = True
    position: int = 0

class FAQCreate(FAQBase):
    pass

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    position: Optional[int] = None

class FAQInDB(FAQBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FAQResponse(FAQInDB):
    pass
