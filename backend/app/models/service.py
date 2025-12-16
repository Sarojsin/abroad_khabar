"""
Service database model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Service(Base):
    """Service model - Educational consultancy services"""
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    slug = Column(String(500), unique=True, index=True, nullable=False)
    excerpt = Column(Text)
    description = Column(Text, nullable=False)
    
    # Service details
    icon = Column(String(100))  # Font icon class
    image_url = Column(String(1000))
    color = Column(String(50))  # Theme color
    
    # Pricing and duration
    price = Column(Float)  # NULL means "Contact for price"
    duration = Column(String(100))  # e.g., "4-6 weeks"
    success_rate = Column(Float)  # Percentage
    
    # Features and benefits
    features = Column(JSON)  # List of features
    benefits = Column(JSON)  # List of benefits
    process = Column(JSON)   # List of process steps
    requirements = Column(JSON)  # List of requirements
    
    # Status and ordering
    status = Column(String(50), default="active", nullable=False)
    is_featured = Column(Boolean, default=False)
    is_popular = Column(Boolean, default=False)
    position = Column(Integer, default=0)
    order_count = Column(Integer, default=0)
    
    # Category
    category_id = Column(Integer, ForeignKey("service_categories.id"))
    
    # SEO
    seo_title = Column(String(500))
    seo_description = Column(Text)
    seo_keywords = Column(String(500))
    
    # Statistics
    views = Column(Integer, default=0)
    inquiries = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("ServiceCategory", back_populates="services")
    
    def __repr__(self):
        return f"<Service(id={self.id}, title={self.title}, status={self.status})>"

class ServiceCategory(Base):
    """Service category model"""
    __tablename__ = "service_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text)
    icon = Column(String(100))
    color = Column(String(50))
    
    # Ordering
    position = Column(Integer, default=0)
    
    # Statistics
    service_count = Column(Integer, default=0)
    
    # SEO
    seo_title = Column(String(200))
    seo_description = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    services = relationship("Service", back_populates="category")
    
    def __repr__(self):
        return f"<ServiceCategory(id={self.id}, name={self.name})>"