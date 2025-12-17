from sqlalchemy import Column, String, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class HomepageSection(Base):
    __tablename__ = "homepage_sections"

    key = Column(String(50), primary_key=True, index=True) # e.g. "hero", "counters", "about"
    content = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    def __repr__(self):
        return f"<HomepageSection(key={self.key})>"
