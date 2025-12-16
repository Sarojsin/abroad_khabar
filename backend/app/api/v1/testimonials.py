from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.session import get_db
from ...models.testimonial import Testimonial
from ...schemas.testimonial import TestimonialCreate, TestimonialUpdate, TestimonialResponse
from ...services.testimonial_service import TestimonialService
from ...auth.dependencies import get_current_admin_user
from ...models.user import User

router = APIRouter()

@router.get("/", response_model=List[TestimonialResponse])
async def get_testimonials(
    is_approved: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all testimonials"""
    testimonial_service = TestimonialService(db)
    testimonials = testimonial_service.get_testimonials(
        is_approved=is_approved,
        is_featured=is_featured
    )
    return testimonials

@router.post("/", response_model=TestimonialResponse)
async def create_testimonial(
    testimonial_data: TestimonialCreate,
    db: Session = Depends(get_db)
):
    """Create a new testimonial"""
    testimonial_service = TestimonialService(db)
    testimonial = testimonial_service.create_testimonial(testimonial_data)
    return testimonial

@router.put("/{testimonial_id}", response_model=TestimonialResponse)
async def update_testimonial(
    testimonial_id: int,
    testimonial_data: TestimonialUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update testimonial (admin only)"""
    testimonial_service = TestimonialService(db)
    testimonial = testimonial_service.update_testimonial(testimonial_id, testimonial_data)
    if not testimonial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testimonial not found"
        )
    return testimonial

@router.put("/{testimonial_id}/approve")
async def approve_testimonial(
    testimonial_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Approve testimonial (admin only)"""
    testimonial_service = TestimonialService(db)
    success = testimonial_service.approve_testimonial(testimonial_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testimonial not found"
        )
    return {"message": "Testimonial approved"}