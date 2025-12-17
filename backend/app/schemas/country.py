from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CountryBase(BaseModel):
    name: str
    code: str
    image_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class CountryCreate(CountryBase):
    pass

class CountryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CountryInDB(CountryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CountryResponse(CountryInDB):
    pass
