from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models.blog import Blog, BlogCategory, BlogStatus
from app.models.user import User, UserRole
from app.schemas.blog import BlogCreate, BlogUpdate, BlogResponse, BlogBulkUpdate, BlogBulkDelete
from app.utils.response import custom_response

# Helper to get admin user
def get_current_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

router = APIRouter()

@router.get("/", response_model=dict)
async def get_blogs(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """
    Get all blogs with filtering
    """
    query = db.query(Blog)

    if status:
        query = query.filter(Blog.status == status)
    
    if category and category != 'all':
        query = query.join(BlogCategory).filter(BlogCategory.slug == category)
        
    if search:
        query = query.filter(Blog.title.ilike(f"%{search}%"))

    total = query.count()
    blogs = query.order_by(Blog.created_at.desc()).offset(skip).limit(limit).all()
    
    return custom_response(
        data={
            "blogs": [{**BlogResponse.model_validate(b).model_dump(), "category": b.category.slug if b.category else None} for b in blogs],
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/{id}", response_model=dict)
async def get_blog(
    id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single blog by ID
    """
    blog = db.query(Blog).filter(Blog.id == id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    blog_data = BlogResponse.model_validate(blog).model_dump()
    if blog.category:
        blog_data["category"] = blog.category.slug
        
    return custom_response(data={"blog": blog_data})

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_blog(
    blog_data: BlogCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new blog
    """
    # Generate slug from title if not provided
    import re
    slug = blog_data.slug
    if not slug:
        slug = re.sub(r'[^a-z0-9]+', '-', blog_data.title.lower()).strip('-')
    
    # Check current slug uniqueness
    existing = db.query(Blog).filter(Blog.slug == slug).first()
    if existing:
        import uuid
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    # Handle category lookup by slug if category_id is missing
    category_id = blog_data.category_id
    if not category_id and blog_data.category:
        db_category = db.query(BlogCategory).filter(BlogCategory.slug == blog_data.category).first()
        if db_category:
            category_id = db_category.id

    # Create blog
    blog_dict = blog_data.model_dump(exclude={"slug", "author_id", "category"})
    blog_dict["category_id"] = category_id
    
    new_blog = Blog(
        **blog_dict,
        slug=slug,
        author_id=current_user.id
    )
    
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    
    blog_data = BlogResponse.model_validate(new_blog).model_dump()
    if new_blog.category:
        blog_data["category"] = new_blog.category.slug

    return custom_response(
        message="Blog created successfully",
        data={"blog": blog_data}
    )

@router.put("/{id}", response_model=dict)
async def update_blog(
    id: int,
    blog_data: BlogUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update a blog
    """
    blog = db.query(Blog).filter(Blog.id == id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    # Update fields
    update_data = blog_data.model_dump(exclude_unset=True, exclude={"category"})
    
    # Handle category lookup by slug
    if "category" in blog_data.model_dump(exclude_unset=True) and not blog_data.category_id:
        db_category = db.query(BlogCategory).filter(BlogCategory.slug == blog_data.category).first()
        if db_category:
            update_data["category_id"] = db_category.id

    for key, value in update_data.items():
        setattr(blog, key, value)
            
    db.commit()
    db.refresh(blog)
    
    blog_data = BlogResponse.model_validate(blog).model_dump()
    if blog.category:
        blog_data["category"] = blog.category.slug

    return custom_response(
        message="Blog updated successfully",
        data={"blog": blog_data}
    )

@router.delete("/{id}", response_model=dict)
async def delete_blog(
    id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a blog
    """
    blog = db.query(Blog).filter(Blog.id == id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    db.delete(blog)
    db.commit()
    return custom_response(message="Blog deleted successfully")

@router.post("/bulk-update", response_model=dict)
async def bulk_update_blogs(
    bulk_data: BlogBulkUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Bulk update blogs"""
    if not bulk_data.ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    update_data = bulk_data.model_dump(exclude_unset=True, exclude={"ids"})
    if update_data:
        db.query(Blog).filter(Blog.id.in_(bulk_data.ids)).update(update_data, synchronize_session=False)
        db.commit()
    
    return custom_response(message=f"{len(bulk_data.ids)} blogs updated successfully")

@router.post("/bulk-delete", response_model=dict)
async def bulk_delete_blogs(
    bulk_data: BlogBulkDelete,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Bulk delete blogs"""
    if not bulk_data.ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    db.query(Blog).filter(Blog.id.in_(bulk_data.ids)).delete(synchronize_session=False)
    db.commit()
    
    return custom_response(message=f"{len(bulk_data.ids)} blogs deleted successfully")
