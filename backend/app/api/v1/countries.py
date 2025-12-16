from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.session import get_db
from ...models.country import Country
from ...schemas.country import CountryCreate, CountryUpdate, CountryResponse
from ...services.country_service import CountryService
from ...auth.dependencies import get_current_admin_user
from ...models.user import User

router = APIRouter()

@router.get("/", response_model=List[CountryResponse])
async def get_countries(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all countries"""
    country_service = CountryService(db)
    countries = country_service.get_countries(is_active=is_active)
    return countries

@router.get("/{country_id}", response_model=CountryResponse)
async def get_country(country_id: int, db: Session = Depends(get_db)):
    """Get country by ID"""
    country_service = CountryService(db)
    country = country_service.get_country(country_id)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    return country

@router.post("/", response_model=CountryResponse)
async def create_country(
    country_data: CountryCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new country (admin only)"""
    country_service = CountryService(db)
    country = country_service.create_country(country_data)
    return country

@router.put("/{country_id}", response_model=CountryResponse)
async def update_country(
    country_id: int,
    country_data: CountryUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update country (admin only)"""
    country_service = CountryService(db)
    country = country_service.update_country(country_id, country_data)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    return country

@router.delete("/{country_id}")
async def delete_country(
    country_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete country (admin only)"""
    country_service = CountryService(db)
    success = country_service.delete_country(country_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    return {"message": "Country deleted successfully"}