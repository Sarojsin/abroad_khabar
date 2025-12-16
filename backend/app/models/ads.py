"""
Advertisement database model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class AdType(str, enum.Enum):
    """Advertisement type enum"""
    BANNER = "banner"
    SIDEBAR = "sidebar"
    VIDEO = "video"
    POPUP = "popup"
    INLINE = "inline"

class AdStatus(str, enum.Enum):
    """Advertisement status enum"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"

class AdPosition(str, enum.Enum):
    """Advertisement position enum"""
    HEADER = "header"
    SIDEBAR = "sidebar"
    FOOTER = "footer"
    INLINE = "inline"
    POPUP = "popup"

class Advertisement(Base):
    """Advertisement model"""
    __tablename__ = "advertisements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    
    # Ad details
    ad_type = Column(Enum(AdType), default=AdType.BANNER, nullable=False)
    position = Column(Enum(AdPosition), nullable=False)
    image_url = Column(String(1000))
    video_url = Column(String(1000))
    url = Column(String(1000))  # Target URL
    
    # Scheduling
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))
    status = Column(Enum(AdStatus), default=AdStatus.DRAFT, nullable=False)
    
    # Targeting
    pages = Column(JSON)  # List of pages where ad should appear
    countries = Column(JSON)  # List of target countries
    devices = Column(JSON)  # List of target devices
    
    # Limits
    max_impressions = Column(Integer)  # NULL = unlimited
    max_clicks = Column(Integer)  # NULL = unlimited
    daily_budget = Column(Integer)  # In cents
    
    # Statistics
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)  # Click-through rate
    
    # Creator
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", back_populates="ads")
    
    def __repr__(self):
        return f"<Advertisement(id={self.id}, title={self.title}, status={self.status})>"