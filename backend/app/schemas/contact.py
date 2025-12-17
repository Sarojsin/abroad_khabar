from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

class ContactBase(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    status: Optional[str] = None
    
class ContactResponse(ContactBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
