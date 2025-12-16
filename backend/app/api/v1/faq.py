from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.session import get_db
from ...models.faq import FAQ
from ...schemas.faq import FAQCreate, FAQUpdate, FAQResponse
from ...services.faq_service import FAQService
from ...auth.dependencies import get_current_admin_user
from ...models.user import User

router = APIRouter()

@router.get("/", response_model=List[FAQResponse])
async def get_faqs(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all FAQs"""
    faq_service = FAQService(db)
    faqs = faq_service.get_faqs(category=category, is_active=is_active)
    return faqs

@router.get("/categories", response_model=List[str])
async def get_faq_categories(db: Session = Depends(get_db)):
    """Get FAQ categories"""
    faq_service = FAQService(db)
    categories = faq_service.get_categories()
    return categories

@router.post("/", response_model=FAQResponse)
async def create_faq(
    faq_data: FAQCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create FAQ (admin only)"""
    faq_service = FAQService(db)
    faq = faq_service.create_faq(faq_data)
    return faq

@router.put("/{faq_id}", response_model=FAQResponse)
async def update_faq(
    faq_id: int,
    faq_data: FAQUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update FAQ (admin only)"""
    faq_service = FAQService(db)
    faq = faq_service.update_faq(faq_id, faq_data)
    if not faq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    return faq

@router.delete("/{faq_id}")
async def delete_faq(
    faq_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete FAQ (admin only)"""
    faq_service = FAQService(db)
    success = faq_service.delete_faq(faq_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    return {"message": "FAQ deleted successfully"}