from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None

# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    username: str
    password: str

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None

# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    id: Optional[int] = None
    role: Optional[str] = None
    status: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Properties to return to client
class UserResponse(UserInDBBase):
    pass

# Login request
class LoginRequest(BaseModel):
    email_or_username: str
    password: str

# Refresh token request
class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Token response
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: Optional[int] = None
