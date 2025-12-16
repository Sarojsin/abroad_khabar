from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from ...db.session import get_db
from ...services.homepage_service import HomepageService
from ...auth.dependencies import get_current_admin_user
from ...models.user import User

router = APIRouter()

@router.get("/")
async def get_homepage_content(db: Session = Depends(get_db)):
    """Get homepage content"""
    homepage_service = HomepageService(db)
    content = homepage_service.get_homepage_content()
    return content

@router.put("/hero")
async def update_hero_section(
    hero_data: Dict[str, Any],
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update hero section (admin only)"""
    homepage_service = HomepageService(db)
    success = homepage_service.update_hero_section(hero_data)
    return {"message": "Hero section updated", "success": success}

@router.put("/counters")
async def update_counters(
    counters: Dict[str, int],
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update counters (admin only)"""
    homepage_service = HomepageService(db)
    success = homepage_service.update_counters(counters)
    return {"message": "Counters updated", "success": success}

@router.put("/sections/{section_name}")
async def toggle_section(
    section_name: str,
    enabled: bool,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Toggle homepage section visibility (admin only)"""
    homepage_service = HomepageService(db)
    success = homepage_service.toggle_section(section_name, enabled)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid section name"
        )
    return {"message": f"Section {section_name} toggled", "success": True}