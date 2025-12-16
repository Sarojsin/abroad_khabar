"""
Blog database model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class BlogStatus(str, enum.Enum):
    """Blog status enum"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    SCHEDULED = "scheduled"

class Blog(Base):
    """Blog model"""
    __tablename__ = "blogs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    slug = Column(String(500), unique=True, index=True, nullable=False)
    excerpt = Column(Text)
    content = Column(Text, nullable=False)
    featured_image = Column(String(1000))
    
    # Status and visibility
    status = Column(Enum(BlogStatus), default=BlogStatus.DRAFT, nullable=False)
    is_featured = Column(Boolean, default=False)
    allow_comments = Column(Boolean, default=True)
    views = Column(Integer, default=0)
    
    # SEO
    meta_title = Column(String(500))
    meta_description = Column(Text)
    meta_keywords = Column(String(500))
    
    # Categorization
    category_id = Column(Integer, ForeignKey("blog_categories.id"))
    tags = Column(JSON)  # List of tags
    
    # Author
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))
    
    # Relationships
    author = relationship("User", back_populates="blogs")
    category = relationship("BlogCategory", back_populates="blogs")
    comments = relationship("BlogComment", back_populates="blog", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Blog(id={self.id}, title={self.title}, status={self.status})>"

class BlogCategory(Base):
    """Blog category model"""
    __tablename__ = "blog_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("blog_categories.id"))
    
    # SEO
    meta_title = Column(String(200))
    meta_description = Column(Text)
    
    # Relationships
    blogs = relationship("Blog", back_populates="category")
    parent = relationship("BlogCategory", remote_side=[id], backref="children")
    
    def __repr__(self):
        return f"<BlogCategory(id={self.id}, name={self.name})>"

class BlogComment(Base):
    """Blog comment model"""
    __tablename__ = "blog_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    blog_id = Column(Integer, ForeignKey("blogs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_id = Column(Integer, ForeignKey("blog_comments.id"))
    
    # Comment content
    author_name = Column(String(200), nullable=False)
    author_email = Column(String(255))
    author_ip = Column(String(45))
    content = Column(Text, nullable=False)
    
    # Status
    is_approved = Column(Boolean, default=False)
    is_spam = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    blog = relationship("Blog", back_populates="comments")
    user = relationship("User")
    parent = relationship("BlogComment", remote_side=[id], backref="replies")
    
    def __repr__(self):
        return f"<BlogComment(id={self.id}, blog_id={self.blog_id}, author={self.author_name})>"