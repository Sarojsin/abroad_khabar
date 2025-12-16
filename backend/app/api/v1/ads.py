"""
Advertisements API endpoints
"""
from datetime import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from app.core.permissions import require_permission, Permission
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.ads import Advertisement, AdStatus, AdType, AdPosition
from app.schemas.ads import (
    AdCreate,
    AdUpdate,
    AdResponse,
    AdFilter,
    AdBulkUpdate,
    AdBulkDelete,
    AdStats,
    AdClick,
    AdImpression,
    DailyAdStats,
    AdDetailedStats
)
from app.utils.response import custom_response
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=dict)
async def get_ads(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    ad_type: Optional[AdType] = None,
    position: Optional[AdPosition] = None,
    status: Optional[AdStatus] = None,
    page: Optional[str] = None,
    country: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get advertisements with filtering and pagination"""
    query = db.query(Advertisement)
    
    # Apply filters for non-admin users
    if not current_user or current_user.role != UserRole.ADMIN:
        now = datetime.utcnow()
        query = query.filter(
            Advertisement.status == AdStatus.ACTIVE,
            Advertisement.start_date <= now,
            (Advertisement.end_date.is_(None)) | (Advertisement.end_date >= now)
        )
        
        # Filter by page if provided
        if page:
            query = query.filter(Advertisement.pages.contains([page]))
    
    # Apply other filters
    if search:
        query = query.filter(
            (Advertisement.title.ilike(f"%{search}%")) |
            (Advertisement.description.ilike(f"%{search}%"))
        )
    
    if ad_type:
        query = query.filter(Advertisement.ad_type == ad_type)
    if position:
        query = query.filter(Advertisement.position == position)
    if status:
        query = query.filter(Advertisement.status == status)
    if country:
        query = query.filter(Advertisement.countries.contains([country]))
    
    # Apply active filter for admin users
    if current_user and current_user.role == UserRole.ADMIN and is_active is not None:
        now = datetime.utcnow()
        if is_active:
            query = query.filter(
                Advertisement.status == AdStatus.ACTIVE,
                Advertisement.start_date <= now,
                (Advertisement.end_date.is_(None)) | (Advertisement.end_date >= now)
            )
        else:
            query = query.filter(
                (Advertisement.status != AdStatus.ACTIVE) |
                (Advertisement.start_date > now) |
                (Advertisement.end_date.isnot(None) & (Advertisement.end_date < now))
            )
    
    # Get total count
    total = query.count()
    
    # Apply sorting (default: by start_date descending)
    query = query.order_by(desc(Advertisement.start_date))
    
    # Apply pagination
    ads = query.offset(skip).limit(limit).all()
    
    # Format response
    ad_responses = []
    for ad in ads:
        ad_dict = AdResponse.model_validate(ad).model_dump()
        ad_dict["created_by_name"] = ad.created_by.full_name if ad.created_by else None
        
        # Calculate CTR
        if ad.impressions > 0:
            ad_dict["ctr"] = (ad.clicks / ad.impressions) * 100
        else:
            ad_dict["ctr"] = 0.0
        
        ad_responses.append(ad_dict)
    
    return custom_response(
        data={
            "ads": ad_responses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/active", response_model=dict)
async def get_active_ads(
    request: Request,
    position: Optional[AdPosition] = None,
    page: Optional[str] = None,
    country: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
) -> Any:
    """Get active advertisements for display"""
    now = datetime.utcnow()
    query = db.query(Advertisement).filter(
        Advertisement.status == AdStatus.ACTIVE,
        Advertisement.start_date <= now,
        (Advertisement.end_date.is_(None)) | (Advertisement.end_date >= now)
    )
    
    # Apply filters
    if position:
        query = query.filter(Advertisement.position == position)
    if page:
        query = query.filter(Advertisement.pages.contains([page]))
    if country:
        query = query.filter(
            (Advertisement.countries.is_(None)) |
            (Advertisement.countries == []) |
            (Advertisement.countries.contains([country]))
        )
    
    # Order by priority (featured, then by start date)
    query = query.order_by(
        desc(Advertisement.start_date)  # You could add a priority field
    )
    
    # Get ads
    ads = query.limit(limit).all()
    
    # Format response
    ad_responses = []
    for ad in ads:
        ad_dict = AdResponse.model_validate(ad).model_dump()
        ad_dict["created_by_name"] = ad.created_by.full_name if ad.created_by else None
        
        # Track impression
        ad.impressions += 1
        db.commit()
        
        ad_responses.append(ad_dict)
    
    return custom_response(data={"ads": ad_responses})

@router.get("/{ad_id}", response_model=dict)
async def get_ad(
    ad_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get advertisement by ID"""
    query = db.query(Advertisement).filter(Advertisement.id == ad_id)
    
    # Non-admin users can only see active ads
    if not current_user or current_user.role != UserRole.ADMIN:
        now = datetime.utcnow()
        query = query.filter(
            Advertisement.status == AdStatus.ACTIVE,
            Advertisement.start_date <= now,
            (Advertisement.end_date.is_(None)) | (Advertisement.end_date >= now)
        )
    
    ad = query.first()
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    ad_dict = AdResponse.model_validate(ad).model_dump()
    ad_dict["created_by_name"] = ad.created_by.full_name if ad.created_by else None
    
    return custom_response(data={"ad": ad_dict})

@router.post("/", response_model=dict)
async def create_ad(
    ad_data: AdCreate,
    current_user: User = Depends(require_permission(Permission.AD_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new advertisement"""
    # Create ad
    ad = Advertisement(
        **ad_data.dict(exclude={"created_by_id"}),
        created_by_id=current_user.id
    )
    
    db.add(ad)
    db.commit()
    db.refresh(ad)
    
    ad_dict = AdResponse.model_validate(ad).model_dump()
    ad_dict["created_by_name"] = current_user.full_name
    
    return custom_response(
        message="Advertisement created successfully",
        data={"ad": ad_dict}
    )

@router.put("/{ad_id}", response_model=dict)
async def update_ad(
    ad_id: int,
    ad_data: AdUpdate,
    current_user: User = Depends(require_permission(Permission.AD_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Update advertisement"""
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Check permission (editor can only edit their own ads unless admin)
    if current_user.role != UserRole.ADMIN and ad.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own advertisements"
        )
    
    # Update ad
    update_data = ad_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ad, field, value)
    
    db.commit()
    db.refresh(ad)
    
    ad_dict = AdResponse.model_validate(ad).model_dump()
    ad_dict["created_by_name"] = ad.created_by.full_name if ad.created_by else None
    
    return custom_response(
        message="Advertisement updated successfully",
        data={"ad": ad_dict}
    )

@router.delete("/{ad_id}", response_model=dict)
async def delete_ad(
    ad_id: int,
    current_user: User = Depends(require_permission(Permission.AD_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Delete advertisement"""
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Check permission (editor can only delete their own ads unless admin)
    if current_user.role != UserRole.ADMIN and ad.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own advertisements"
        )
    
    db.delete(ad)
    db.commit()
    
    return custom_response(message="Advertisement deleted successfully")

@router.patch("/{ad_id}/status", response_model=dict)
async def update_ad_status(
    ad_id: int,
    status: AdStatus,
    current_user: User = Depends(require_permission(Permission.AD_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Update advertisement status"""
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Check permission (editor can only update their own ads unless admin)
    if current_user.role != UserRole.ADMIN and ad.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own advertisements"
        )
    
    ad.status = status
    db.commit()
    
    return custom_response(
        message=f"Advertisement status updated to {status.value}"
    )

@router.post("/{ad_id}/click", response_model=dict)
async def track_ad_click(
    ad_id: int,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """Track advertisement click"""
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Check if ad is active
    now = datetime.utcnow()
    if (ad.status != AdStatus.ACTIVE or 
        ad.start_date > now or 
        (ad.end_date and ad.end_date < now)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advertisement is not active"
        )
    
    # Check click limits
    if ad.max_clicks and ad.clicks >= ad.max_clicks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advertisement click limit reached"
        )
    
    # Update click count
    ad.clicks += 1
    
    # Recalculate CTR
    if ad.impressions > 0:
        ad.ctr = (ad.clicks / ad.impressions) * 100
    
    db.commit()
    
    return custom_response(
        message="Click tracked",
        data={
            "clicks": ad.clicks,
            "ctr": ad.ctr
        }
    )

@router.post("/{ad_id}/impression", response_model=dict)
async def track_ad_impression(
    ad_id: int,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """Track advertisement impression"""
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Check if ad is active
    now = datetime.utcnow()
    if (ad.status != AdStatus.ACTIVE or 
        ad.start_date > now or 
        (ad.end_date and ad.end_date < now)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advertisement is not active"
        )
    
    # Check impression limits
    if ad.max_impressions and ad.impressions >= ad.max_impressions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advertisement impression limit reached"
        )
    
    # Update impression count
    ad.impressions += 1
    
    # Recalculate CTR
    if ad.impressions > 0:
        ad.ctr = (ad.clicks / ad.impressions) * 100
    
    db.commit()
    
    return custom_response(
        message="Impression tracked",
        data={
            "impressions": ad.impressions,
            "ctr": ad.ctr
        }
    )

@router.post("/bulk-update", response_model=dict)
async def bulk_update_ads(
    bulk_data: AdBulkUpdate,
    current_user: User = Depends(require_permission(Permission.AD_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk update advertisements"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No advertisement IDs provided"
        )
    
    # Check permission for all ads
    if current_user.role != UserRole.ADMIN:
        user_ads = db.query(Advertisement).filter(
            Advertisement.id.in_(bulk_data.ids),
            Advertisement.created_by_id != current_user.id
        ).count()
        if user_ads > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own advertisements"
            )
    
    # Update ads
    update_data = bulk_data.dict(exclude_unset=True, exclude={"ids"})
    if update_data:
        db.query(Advertisement).filter(Advertisement.id.in_(bulk_data.ids)).update(update_data)
        db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} advertisements updated successfully"
    )

@router.post("/bulk-delete", response_model=dict)
async def bulk_delete_ads(
    bulk_data: AdBulkDelete,
    current_user: User = Depends(require_permission(Permission.AD_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk delete advertisements"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No advertisement IDs provided"
        )
    
    # Check permission for all ads
    if current_user.role != UserRole.ADMIN:
        user_ads = db.query(Advertisement).filter(
            Advertisement.id.in_(bulk_data.ids),
            Advertisement.created_by_id != current_user.id
        ).count()
        if user_ads > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own advertisements"
            )
    
    # Delete ads
    db.query(Advertisement).filter(Advertisement.id.in_(bulk_data.ids)).delete(synchronize_session=False)
    db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} advertisements deleted successfully"
    )

@router.get("/stats/summary", response_model=dict)
async def get_ad_stats(
    current_user: User = Depends(require_permission(Permission.AD_READ)),
    db: Session = Depends(get_db)
) -> Any:
    """Get advertisement statistics"""
    # Total ads
    total_ads = db.query(Advertisement).count()
    
    # Active ads
    now = datetime.utcnow()
    active_ads = db.query(Advertisement).filter(
        Advertisement.status == AdStatus.ACTIVE,
        Advertisement.start_date <= now,
        (Advertisement.end_date.is_(None)) | (Advertisement.end_date >= now)
    ).count()
    
    # Paused ads
    paused_ads = db.query(Advertisement).filter(Advertisement.status == AdStatus.PAUSED).count()
    
    # Draft ads
    draft_ads = db.query(Advertisement).filter(Advertisement.status == AdStatus.DRAFT).count()
    
    # Total impressions
    total_impressions_result = db.query(func.sum(Advertisement.impressions)).scalar() or 0
    
    # Total clicks
    total_clicks_result = db.query(func.sum(Advertisement.clicks)).scalar() or 0
    
    # Overall CTR
    overall_ctr = 0.0
    if total_impressions_result > 0:
        overall_ctr = (total_clicks_result / total_impressions_result) * 100
    
    # Ads by type
    by_type = {}
    type_results = db.query(Advertisement.ad_type, func.count(Advertisement.id)).group_by(Advertisement.ad_type).all()
    for ad_type, count in type_results:
        by_type[ad_type.value] = count
    
    # Ads by position
    by_position = {}
    position_results = db.query(Advertisement.position, func.count(Advertisement.id)).group_by(Advertisement.position).all()
    for position, count in position_results:
        by_position[position.value] = count
    
    # Ads by status
    by_status = {}
    status_results = db.query(Advertisement.status, func.count(Advertisement.id)).group_by(Advertisement.status).all()
    for status, count in status_results:
        by_status[status.value] = count
    
    stats = AdStats(
        total_ads=total_ads,
        active_ads=active_ads,
        paused_ads=paused_ads,
        draft_ads=draft_ads,
        total_impressions=total_impressions_result,
        total_clicks=total_clicks_result,
        overall_ctr=overall_ctr,
        by_type=by_type,
        by_position=by_position,
        by_status=by_status
    )
    
    return custom_response(data={"stats": stats.dict()})

@router.get("/{ad_id}/stats", response_model=dict)
async def get_ad_detailed_stats(
    ad_id: int,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_permission(Permission.AD_READ)),
    db: Session = Depends(get_db)
) -> Any:
    """Get detailed statistics for a specific advertisement"""
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Get basic stats
    stats = AdStats(
        total_ads=1,
        active_ads=1 if ad.status == AdStatus.ACTIVE else 0,
        paused_ads=1 if ad.status == AdStatus.PAUSED else 0,
        draft_ads=1 if ad.status == AdStatus.DRAFT else 0,
        total_impressions=ad.impressions,
        total_clicks=ad.clicks,
        overall_ctr=ad.ctr,
        by_type={ad.ad_type.value: 1},
        by_position={ad.position.value: 1},
        by_status={ad.status.value: 1}
    )
    
    # Get daily stats (mock data - in production, you'd query a separate table)
    daily_stats = []
    for i in range(days):
        date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_stats.append(DailyAdStats(
            date=date,
            impressions=ad.impressions // days + (i % 3),  # Mock variation
            clicks=ad.clicks // days + (i % 2),  # Mock variation
            ctr=ad.ctr
        ))
    
    # Get top performing ads (excluding current)
    top_performing = db.query(Advertisement).filter(
        Advertisement.id != ad_id,
        Advertisement.status == AdStatus.ACTIVE
    ).order_by(
        desc(Advertisement.ctr)
    ).limit(5).all()
    
    top_performing_list = []
    for top_ad in top_performing:
        ad_dict = AdResponse.model_validate(top_ad).model_dump()
        ad_dict["created_by_name"] = top_ad.created_by.full_name if top_ad.created_by else None
        top_performing_list.append(ad_dict)
    
    # Recent activity (mock data)
    recent_activity = [
        {"action": "impression", "timestamp": "2024-01-01T10:00:00", "count": 150},
        {"action": "click", "timestamp": "2024-01-01T10:05:00", "count": 3},
        {"action": "status_change", "timestamp": "2024-01-01T09:00:00", "from": "draft", "to": "active"},
    ]
    
    detailed_stats = AdDetailedStats(
        **stats.dict(),
        daily_stats=daily_stats,
        top_performing=top_performing_list,
        recent_activity=recent_activity
    )
    
    return custom_response(data={"stats": detailed_stats.dict()})