"""
Image database model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Image(Base):
    """Image model"""
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500), nullable=False, index=True)
    original_filename = Column(String(500))
    url = Column(String(1000), nullable=False)
    thumbnail_url = Column(String(1000))
    
    # Image metadata
    width = Column(Integer)
    height = Column(Integer)
    file_size = Column(Integer)  # in bytes
    format = Column(String(50))  # e.g., "jpg", "png"
    alt_text = Column(String(500))
    caption = Column(Text)
    title = Column(String(500))
    
    # Categorization
    category = Column(String(100), index=True)  # e.g., "hero", "gallery", "blog"
    tags = Column(JSON)  # List of tags
    album_id = Column(Integer, ForeignKey("image_albums.id"))
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True))
    
    # Uploader
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    uploaded_by = relationship("User", back_populates="images")
    album = relationship("ImageAlbum", back_populates="images")
    
    def __repr__(self):
        return f"<Image(id={self.id}, filename={self.filename}, category={self.category})>"

class ImageAlbum(Base):
    """Image album model"""
    __tablename__ = "image_albums"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, index=True, nullable=False)
    description = Column(Text)
    cover_image_id = Column(Integer, ForeignKey("images.id"))
    
    # Visibility
    is_public = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Statistics
    image_count = Column(Integer, default=0)
    views = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    images = relationship("Image", back_populates="album")
    cover_image = relationship("Image", foreign_keys=[cover_image_id])
    
    def __repr__(self):
        return f"<ImageAlbum(id={self.id}, name={self.name}, image_count={self.image_count})>"