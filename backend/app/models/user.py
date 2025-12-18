"""
User database model
"""
from sqlalchemy import Boolean, Column, Integer, String, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class UserRole(str, enum.Enum):
    """User role enum"""
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"
    USER = "USER"

class UserStatus(str, enum.Enum):
    """User status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(200))
    hashed_password = Column(String(255), nullable=False)
    
    # Roles and permissions
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    permissions = Column(Text, default="")  # JSON string of additional permissions
    
    # Profile
    avatar_url = Column(String(500))
    bio = Column(Text)
    phone = Column(String(20))
    country = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Security
    email_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    
    # Relationships
    blogs = relationship("Blog", back_populates="author", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="uploaded_by", cascade="all, delete-orphan")
    images = relationship("Image", back_populates="uploaded_by", cascade="all, delete-orphan")
    ads = relationship("Advertisement", back_populates="created_by", cascade="all, delete-orphan")
    
    # Settings
    settings = Column(Text, default="{}")  # JSON string of user settings
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"