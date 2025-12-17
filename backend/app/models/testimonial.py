from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float
from sqlalchemy.sql import func
from app.db.base import Base

class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=True) # e.g. "Student"
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    rating = Column(Float, default=5.0)
    is_approved = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Testimonial(id={self.id}, name={self.name})>"
