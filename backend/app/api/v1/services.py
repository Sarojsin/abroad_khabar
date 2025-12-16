"""
Services API endpoints
"""
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from app.core.permissions import require_permission, Permission
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.service import Service, ServiceCategory
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceFilter,
    ServiceBulkUpdate,
    ServiceBulkDelete,
    ServiceReorder,
    ServiceStats,
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryResponse
)
from app.utils.response import custom_response
from app.core.security import get_current_user

router = APIRouter()

# Categories endpoints
@router.get("/categories", response_model=dict)
async def get_service_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    include_services: bool = Query(False),
    sort_by: str = Query("position", regex="^(position|name|service_count|created_at)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
) -> Any:
    """Get service categories"""
    query = db.query(ServiceCategory)
    
    # Apply search filter
    if search:
        query = query.filter(ServiceCategory.name.ilike(f"%{search}%"))
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(ServiceCategory, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    # Apply pagination
    categories = query.offset(skip).limit(limit).all()
    
    # Format response
    category_responses = []
    for category in categories:
        category_dict = ServiceCategoryResponse.model_validate(category).model_dump()
        
        if include_services:
            services = db.query(Service).filter(
                Service.category_id == category.id,
                Service.status == "active"
            ).all()
            category_dict["services"] = [
                ServiceResponse.model_validate(service).model_dump() 
                for service in services
            ]
        
        category_responses.append(category_dict)
    
    return custom_response(
        data={
            "categories": category_responses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/categories/{category_id}", response_model=dict)
async def get_service_category(
    category_id: int,
    include_services: bool = Query(False),
    db: Session = Depends(get_db)
) -> Any:
    """Get service category by ID"""
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    category_dict = ServiceCategoryResponse.model_validate(category).model_dump()
    
    if include_services:
        services = db.query(Service).filter(
            Service.category_id == category.id,
            Service.status == "active"
        ).all()
        category_dict["services"] = [
            ServiceResponse.model_validate(service).model_dump() 
            for service in services
        ]
    
    return custom_response(data={"category": category_dict})

@router.get("/categories/slug/{slug}", response_model=dict)
async def get_service_category_by_slug(
    slug: str,
    include_services: bool = Query(False),
    db: Session = Depends(get_db)
) -> Any:
    """Get service category by slug"""
    category = db.query(ServiceCategory).filter(ServiceCategory.slug == slug).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    category_dict = ServiceCategoryResponse.model_validate(category).model_dump()
    
    if include_services:
        services = db.query(Service).filter(
            Service.category_id == category.id,
            Service.status == "active"
        ).all()
        category_dict["services"] = [
            ServiceResponse.model_validate(service).model_dump() 
            for service in services
        ]
    
    return custom_response(data={"category": category_dict})

@router.post("/categories", response_model=dict)
async def create_service_category(
    category_data: ServiceCategoryCreate,
    current_user: User = Depends(require_permission(Permission.SERVICE_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new service category"""
    # Check if category with same name or slug exists
    existing_category = db.query(ServiceCategory).filter(
        (ServiceCategory.name == category_data.name) |
        (ServiceCategory.slug == category_data.slug)
    ).first()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name or slug already exists"
        )
    
    # Create category
    category = ServiceCategory(**category_data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return custom_response(
        message="Category created successfully",
        data={"category": ServiceCategoryResponse.model_validate(category).model_dump()}
    )

@router.put("/categories/{category_id}", response_model=dict)
async def update_service_category(
    category_id: int,
    category_data: ServiceCategoryUpdate,
    current_user: User = Depends(require_permission(Permission.SERVICE_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Update service category"""
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if new name or slug conflicts with existing categories
    update_data = category_data.dict(exclude_unset=True)
    
    if "name" in update_data or "slug" in update_data:
        new_name = update_data.get("name", category.name)
        new_slug = update_data.get("slug", category.slug)
        
        conflicting_category = db.query(ServiceCategory).filter(
            (ServiceCategory.id != category_id) &
            ((ServiceCategory.name == new_name) | (ServiceCategory.slug == new_slug))
        ).first()
        
        if conflicting_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name or slug already exists"
            )
    
    # Update category
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    return custom_response(
        message="Category updated successfully",
        data={"category": ServiceCategoryResponse.model_validate(category).model_dump()}
    )

@router.delete("/categories/{category_id}", response_model=dict)
async def delete_service_category(
    category_id: int,
    current_user: User = Depends(require_permission(Permission.SERVICE_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Delete service category"""
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category has services
    service_count = db.query(Service).filter(Service.category_id == category_id).count()
    if service_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with services. Move or delete services first."
        )
    
    db.delete(category)
    db.commit()
    
    return custom_response(message="Category deleted successfully")

# Services endpoints
@router.get("/", response_model=dict)
async def get_services(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    category_slug: Optional[str] = None,
    status: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_popular: Optional[bool] = None,
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort_by: str = Query("position", regex="^(position|title|price|views|created_at)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get services with filtering and pagination"""
    query = db.query(Service).options(joinedload(Service.category))
    
    # Apply filters for non-admin users
    if not current_user or current_user.role != UserRole.ADMIN:
        query = query.filter(Service.status == "active")
    
    # Apply search filter
    if search:
        query = query.filter(
            (Service.title.ilike(f"%{search}%")) |
            (Service.excerpt.ilike(f"%{search}%")) |
            (Service.description.ilike(f"%{search}%"))
        )
    
    # Apply category filter
    if category_id:
        query = query.filter(Service.category_id == category_id)
    elif category_slug:
        category = db.query(ServiceCategory).filter(ServiceCategory.slug == category_slug).first()
        if category:
            query = query.filter(Service.category_id == category.id)
    
    # Apply other filters
    if status:
        query = query.filter(Service.status == status)
    if is_featured is not None:
        query = query.filter(Service.is_featured == is_featured)
    if is_popular is not None:
        query = query.filter(Service.is_popular == is_popular)
    if min_price is not None:
        query = query.filter(Service.price >= min_price)
    if max_price is not None:
        query = query.filter(Service.price <= max_price)
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(Service, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    # Apply pagination
    services = query.offset(skip).limit(limit).all()
    
    # Format response
    service_responses = []
    for service in services:
        service_dict = ServiceResponse.model_validate(service).model_dump()
        service_dict["category_name"] = service.category.name if service.category else None
        service_dict["category_slug"] = service.category.slug if service.category else None
        service_responses.append(service_dict)
    
    return custom_response(
        data={
            "services": service_responses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/featured", response_model=dict)
async def get_featured_services(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
) -> Any:
    """Get featured services"""
    services = db.query(Service).filter(
        Service.status == "active",
        Service.is_featured == True
    ).order_by(Service.position).limit(limit).all()
    
    service_responses = []
    for service in services:
        service_dict = ServiceResponse.model_validate(service).model_dump()
        service_dict["category_name"] = service.category.name if service.category else None
        service_responses.append(service_dict)
    
    return custom_response(data={"services": service_responses})

@router.get("/popular", response_model=dict)
async def get_popular_services(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
) -> Any:
    """Get popular services"""
    services = db.query(Service).filter(
        Service.status == "active",
        Service.is_popular == True
    ).order_by(Service.views.desc()).limit(limit).all()
    
    service_responses = []
    for service in services:
        service_dict = ServiceResponse.model_validate(service).model_dump()
        service_dict["category_name"] = service.category.name if service.category else None
        service_responses.append(service_dict)
    
    return custom_response(data={"services": service_responses})

@router.get("/{service_id}", response_model=dict)
async def get_service(
    service_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get service by ID"""
    query = db.query(Service).options(joinedload(Service.category)).filter(Service.id == service_id)
    
    # Non-admin users can only see active services
    if not current_user or current_user.role != UserRole.ADMIN:
        query = query.filter(Service.status == "active")
    
    service = query.first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Increment view count
    service.views += 1
    db.commit()
    
    service_dict = ServiceResponse.model_validate(service).model_dump()
    service_dict["category_name"] = service.category.name if service.category else None
    service_dict["category_slug"] = service.category.slug if service.category else None
    
    return custom_response(data={"service": service_dict})

@router.get("/slug/{slug}", response_model=dict)
async def get_service_by_slug(
    slug: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get service by slug"""
    query = db.query(Service).options(joinedload(Service.category)).filter(Service.slug == slug)
    
    # Non-admin users can only see active services
    if not current_user or current_user.role != UserRole.ADMIN:
        query = query.filter(Service.status == "active")
    
    service = query.first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Increment view count
    service.views += 1
    db.commit()
    
    service_dict = ServiceResponse.model_validate(service).model_dump()
    service_dict["category_name"] = service.category.name if service.category else None
    service_dict["category_slug"] = service.category.slug if service.category else None
    
    return custom_response(data={"service": service_dict})

@router.post("/", response_model=dict)
async def create_service(
    service_data: ServiceCreate,
    current_user: User = Depends(require_permission(Permission.SERVICE_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new service"""
    # Check if service with same title or slug exists
    existing_service = db.query(Service).filter(
        (Service.title == service_data.title) |
        (Service.slug == service_data.slug)
    ).first()
    
    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service with this title or slug already exists"
        )
    
    # Check if category exists
    if service_data.category_id:
        category = db.query(ServiceCategory).filter(ServiceCategory.id == service_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
    
    # Create service
    service = Service(**service_data.dict())
    db.add(service)
    db.commit()
    db.refresh(service)
    
    # Update category service count
    if service.category_id:
        category_service_count = db.query(Service).filter(Service.category_id == service.category_id).count()
        db.query(ServiceCategory).filter(ServiceCategory.id == service.category_id).update(
            {"service_count": category_service_count}
        )
        db.commit()
    
    service_dict = ServiceResponse.model_validate(service).model_dump()
    service_dict["category_name"] = service.category.name if service.category else None
    
    return custom_response(
        message="Service created successfully",
        data={"service": service_dict}
    )

@router.post("/import-default", response_model=dict)
async def import_default_services(
    current_user: User = Depends(require_permission(Permission.SERVICE_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Import default educational consultancy services"""
    # Check if services already exist
    existing_count = db.query(Service).count()
    if existing_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Services already exist. Clear services first to import defaults."
        )
    
    # Default services data
    default_services = [
        {
            "title": "Personalized Education Counseling",
            "slug": "personalized-education-counseling",
            "excerpt": "One-on-one counseling to help you choose the right educational path.",
            "description": "Comprehensive personalized counseling to help students identify their strengths, interests, and career goals to choose the right educational path.",
            "icon": "icon-graduation-cap",
            "features": ["Career Assessment", "Education Pathway Planning", "Goal Setting"],
            "position": 1,
            "is_featured": True
        },
        {
            "title": "University & Course Selection",
            "slug": "university-course-selection",
            "excerpt": "Expert guidance in selecting the perfect university and course for your goals.",
            "description": "Detailed analysis and recommendations for universities and courses based on academic profile, budget, and career aspirations.",
            "icon": "icon-university",
            "features": ["University Research", "Course Matching", "Admission Requirements"],
            "position": 2,
            "is_featured": True
        },
        # Add more default services here...
    ]
    
    created_count = 0
    for service_data in default_services:
        service = Service(**service_data)
        db.add(service)
        created_count += 1
    
    db.commit()
    
    return custom_response(
        message=f"{created_count} default services imported successfully",
        data={"count": created_count}
    )

@router.put("/{service_id}", response_model=dict)
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: User = Depends(require_permission(Permission.SERVICE_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Update service"""
    service = db.query(Service).filter(Service.id == service_id).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check if new title or slug conflicts with existing services
    update_data = service_data.dict(exclude_unset=True)
    
    if "title" in update_data or "slug" in update_data:
        new_title = update_data.get("title", service.title)
        new_slug = update_data.get("slug", service.slug)
        
        conflicting_service = db.query(Service).filter(
            (Service.id != service_id) &
            ((Service.title == new_title) | (Service.slug == new_slug))
        ).first()
        
        if conflicting_service:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service with this title or slug already exists"
            )
    
    # Check if category exists
    if "category_id" in update_data and update_data["category_id"]:
        category = db.query(ServiceCategory).filter(ServiceCategory.id == update_data["category_id"]).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
    
    # Store old category for count update
    old_category_id = service.category_id
    
    # Update service
    for field, value in update_data.items():
        setattr(service, field, value)
    
    db.commit()
    db.refresh(service)
    
    # Update category service counts if category changed
    if old_category_id != service.category_id:
        # Update old category count
        if old_category_id:
            old_count = db.query(Service).filter(Service.category_id == old_category_id).count()
            db.query(ServiceCategory).filter(ServiceCategory.id == old_category_id).update(
                {"service_count": old_count}
            )
        
        # Update new category count
        if service.category_id:
            new_count = db.query(Service).filter(Service.category_id == service.category_id).count()
            db.query(ServiceCategory).filter(ServiceCategory.id == service.category_id).update(
                {"service_count": new_count}
            )
        
        db.commit()
    
    service_dict = ServiceResponse.model_validate(service).model_dump()
    service_dict["category_name"] = service.category.name if service.category else None
    
    return custom_response(
        message="Service updated successfully",
        data={"service": service_dict}
    )

@router.delete("/{service_id}", response_model=dict)
async def delete_service(
    service_id: int,
    current_user: User = Depends(require_permission(Permission.SERVICE_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Delete service"""
    service = db.query(Service).filter(Service.id == service_id).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Store category ID for count update
    category_id = service.category_id
    
    db.delete(service)
    db.commit()
    
    # Update category service count
    if category_id:
        category_service_count = db.query(Service).filter(Service.category_id == category_id).count()
        db.query(ServiceCategory).filter(ServiceCategory.id == category_id).update(
            {"service_count": category_service_count}
        )
        db.commit()
    
    return custom_response(message="Service deleted successfully")

@router.post("/bulk-update", response_model=dict)
async def bulk_update_services(
    bulk_data: ServiceBulkUpdate,
    current_user: User = Depends(require_permission(Permission.SERVICE_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk update services"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No service IDs provided"
        )
    
    # Update services
    update_data = bulk_data.dict(exclude_unset=True, exclude={"ids"})
    if update_data:
        db.query(Service).filter(Service.id.in_(bulk_data.ids)).update(update_data)
        db.commit()
    
    # Update category counts if category changed
    if "category_id" in update_data:
        category_counts = {}
        services = db.query(Service).filter(Service.id.in_(bulk_data.ids)).all()
        for service in services:
            if service.category_id:
                category_counts[service.category_id] = category_counts.get(service.category_id, 0) + 1
        
        for category_id, count in category_counts.items():
            total_count = db.query(Service).filter(Service.category_id == category_id).count()
            db.query(ServiceCategory).filter(ServiceCategory.id == category_id).update(
                {"service_count": total_count}
            )
        
        db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} services updated successfully"
    )

@router.post("/bulk-delete", response_model=dict)
async def bulk_delete_services(
    bulk_data: ServiceBulkDelete,
    current_user: User = Depends(require_permission(Permission.SERVICE_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk delete services"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No service IDs provided"
        )
    
    # Get services to delete
    services = db.query(Service).filter(Service.id.in_(bulk_data.ids)).all()
    
    # Track categories for count update
    category_counts = {}
    for service in services:
        if service.category_id:
            category_counts[service.category_id] = category_counts.get(service.category_id, 0) + 1
    
    # Delete services
    db.query(Service).filter(Service.id.in_(bulk_data.ids)).delete(synchronize_session=False)
    db.commit()
    
    # Update category counts
    for category_id, count in category_counts.items():
        total_count = db.query(Service).filter(Service.category_id == category_id).count()
        db.query(ServiceCategory).filter(ServiceCategory.id == category_id).update(
            {"service_count": total_count}
        )
    
    db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} services deleted successfully"
    )

@router.put("/reorder", response_model=dict)
async def reorder_services(
    reorder_data: ServiceReorder,
    current_user: User = Depends(require_permission(Permission.SERVICE_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Reorder services"""
    for item in reorder_data.order:
        service_id = item.get("id")
        position = item.get("position")
        
        if service_id and position is not None:
            db.query(Service).filter(Service.id == service_id).update({"position": position})
    
    db.commit()
    
    return custom_response(message="Services reordered successfully")

@router.get("/stats/summary", response_model=dict)
async def get_service_stats(
    current_user: User = Depends(require_permission(Permission.SERVICE_READ)),
    db: Session = Depends(get_db)
) -> Any:
    """Get service statistics"""
    # Total services
    total_services = db.query(Service).count()
    
    # Active services
    active_services = db.query(Service).filter(Service.status == "active").count()
    
    # Featured services
    featured_services = db.query(Service).filter(Service.is_featured == True).count()
    
    # Total categories
    total_categories = db.query(ServiceCategory).count()
    
    # Total views
    total_views_result = db.query(func.sum(Service.views)).scalar() or 0
    
    # Total inquiries
    total_inquiries_result = db.query(func.sum(Service.inquiries)).scalar() or 0
    
    # Average price
    avg_price_result = db.query(func.avg(Service.price)).filter(Service.price > 0).scalar()
    avg_price = float(avg_price_result) if avg_price_result else None
    
    # Services by category
    by_category = {}
    category_results = db.query(
        ServiceCategory.name,
        func.count(Service.id)
    ).join(Service, ServiceCategory.id == Service.category_id, isouter=True).group_by(ServiceCategory.id).all()
    
    for category_name, count in category_results:
        if category_name:
            by_category[category_name] = count
    
    # Recent services
    recent_services = db.query(Service).order_by(desc(Service.created_at)).limit(5).all()
    recent_services_list = [
        ServiceResponse.model_validate(service).model_dump() 
        for service in recent_services
    ]
    
    stats = ServiceStats(
        total_services=total_services,
        active_services=active_services,
        featured_services=featured_services,
        total_categories=total_categories,
        total_views=total_views_result,
        total_inquiries=total_inquiries_result,
        avg_price=avg_price,
        by_category=by_category,
        recent_services=recent_services_list
    )
    
    return custom_response(data={"stats": stats.dict()})