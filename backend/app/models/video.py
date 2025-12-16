"""
Video database model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class VideoType(str, enum.Enum):
    """Video type enum"""
    SELF_HOSTED = "self_hosted"
    YOUTUBE = "youtube"
    VIMEO = "vimeo"
    DAILYMOTION = "dailymotion"

class VideoStatus(str, enum.Enum):
    """Video status enum"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class Video(Base):
    """Video model"""
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text)
    
    # Video sources
    video_type = Column(Enum(VideoType), default=VideoType.SELF_HOSTED, nullable=False)
    video_url = Column(String(1000))  # For self-hosted videos
    embed_url = Column(String(1000))  # For YouTube/Vimeo embeds
    thumbnail_url = Column(String(1000))
    
    # Video metadata
    duration = Column(Float)  # in seconds
    file_size = Column(Integer)  # in bytes
    resolution = Column(String(50))  # e.g., "1920x1080"
    format = Column(String(50))  # e.g., "mp4"
    
    # Status and visibility
    status = Column(Enum(VideoStatus), default=VideoStatus.DRAFT, nullable=False)
    is_featured = Column(Boolean, default=False)
    allow_comments = Column(Boolean, default=True)
    allow_download = Column(Boolean, default=False)
    
    # Player settings
    autoplay = Column(Boolean, default=False)
    loop = Column(Boolean, default=False)
    muted = Column(Boolean, default=False)
    
    # Categorization
    category = Column(String(100), index=True)
    tags = Column(JSON)  # List of tags
    service_id = Column(Integer, ForeignKey("services.id"))
    country = Column(String(100), index=True)
    
    # SEO
    seo_title = Column(String(500))
    seo_description = Column(Text)
    seo_keywords = Column(String(500))
    
    # Statistics
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    
    # Uploader
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))
    
    # Relationships
    uploaded_by = relationship("User", back_populates="videos")
    service = relationship("Service")
    
    def __repr__(self):
        return f"<Video(id={self.id}, title={self.title}, type={self.video_type})>"