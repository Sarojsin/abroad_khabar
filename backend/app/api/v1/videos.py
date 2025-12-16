"""
Video API endpoints
"""
import os
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.permissions import require_permission, Permission
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.video import Video, VideoStatus, VideoType
from app.schemas.video import (
    VideoCreate, 
    VideoUpdate, 
    VideoResponse,
    VideoFilter,
    VideoBulkUpdate,
    VideoBulkDelete,
    VideoStats
)
from app.utils.response import custom_response
from app.utils.file import save_video_file, validate_video_file, generate_thumbnail
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=dict)
async def get_videos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    category: Optional[str] = None,
    service_id: Optional[int] = None,
    country: Optional[str] = None,
    status: Optional[VideoStatus] = None,
    is_featured: Optional[bool] = None,
    video_type: Optional[VideoType] = None,
    tags: Optional[List[str]] = Query(None),
    sort_by: str = Query("created_at", regex="^(created_at|title|views|published_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get videos with filtering and pagination"""
    query = db.query(Video)
    
    # Apply filters for non-admin users
    if not current_user or current_user.role != UserRole.ADMIN:
        query = query.filter(Video.status == VideoStatus.PUBLISHED)
    
    # Apply search filter
    if search:
        query = query.filter(
            (Video.title.ilike(f"%{search}%")) |
            (Video.description.ilike(f"%{search}%"))
        )
    
    # Apply other filters
    if category:
        query = query.filter(Video.category == category)
    if service_id:
        query = query.filter(Video.service_id == service_id)
    if country:
        query = query.filter(Video.country == country)
    if status:
        query = query.filter(Video.status == status)
    if is_featured is not None:
        query = query.filter(Video.is_featured == is_featured)
    if video_type:
        query = query.filter(Video.video_type == video_type)
    if tags:
        for tag in tags:
            query = query.filter(Video.tags.contains([tag]))
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(Video, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    # Apply pagination
    videos = query.offset(skip).limit(limit).all()
    
    # Format response
    video_responses = []
    for video in videos:
        video_dict = VideoResponse.model_validate(video).model_dump()
        video_dict["uploaded_by_name"] = video.uploaded_by.full_name if video.uploaded_by else None
        video_dict["service_title"] = video.service.title if video.service else None
        video_responses.append(video_dict)
    
    return custom_response(
        data={
            "videos": video_responses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/featured", response_model=dict)
async def get_featured_videos(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
) -> Any:
    """Get featured videos"""
    videos = db.query(Video).filter(
        Video.status == VideoStatus.PUBLISHED,
        Video.is_featured == True
    ).order_by(desc(Video.created_at)).limit(limit).all()
    
    video_responses = []
    for video in videos:
        video_dict = VideoResponse.model_validate(video).model_dump()
        video_dict["uploaded_by_name"] = video.uploaded_by.full_name if video.uploaded_by else None
        video_responses.append(video_dict)
    
    return custom_response(data={"videos": video_responses})

@router.get("/{video_id}", response_model=dict)
async def get_video(
    video_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get video by ID"""
    query = db.query(Video).filter(Video.id == video_id)
    
    # Non-admin users can only see published videos
    if not current_user or current_user.role != UserRole.ADMIN:
        query = query.filter(Video.status == VideoStatus.PUBLISHED)
    
    video = query.first()
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Increment view count
    video.views += 1
    db.commit()
    
    video_dict = VideoResponse.model_validate(video).model_dump()
    video_dict["uploaded_by_name"] = video.uploaded_by.full_name if video.uploaded_by else None
    video_dict["service_title"] = video.service.title if video.service else None
    
    return custom_response(data={"video": video_dict})

@router.post("/", response_model=dict)
async def create_video(
    video_data: VideoCreate,
    current_user: User = Depends(require_permission(Permission.VIDEO_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new video"""
    # Check if video with same title exists
    existing_video = db.query(Video).filter(Video.title == video_data.title).first()
    if existing_video:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video with this title already exists"
        )
    
    # Create video
    video = Video(
        **video_data.dict(exclude={"uploaded_by_id"}),
        uploaded_by_id=current_user.id
    )
    
    # Set published date if status is published
    if video.status == VideoStatus.PUBLISHED:
        from sqlalchemy.sql import func
        video.published_at = func.now()
    
    db.add(video)
    db.commit()
    db.refresh(video)
    
    video_dict = VideoResponse.model_validate(video).model_dump()
    video_dict["uploaded_by_name"] = current_user.full_name
    
    return custom_response(
        message="Video created successfully",
        data={"video": video_dict}
    )

@router.put("/{video_id}", response_model=dict)
async def update_video(
    video_id: int,
    video_data: VideoUpdate,
    current_user: User = Depends(require_permission(Permission.VIDEO_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Update video"""
    video = db.query(Video).filter(Video.id == video_id).first()
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Check permission (editor can only edit their own videos unless admin)
    if current_user.role != UserRole.ADMIN and video.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own videos"
        )
    
    # Update video fields
    update_data = video_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(video, field, value)
    
    # Update published date if status changed to published
    if video_data.status == VideoStatus.PUBLISHED and video.status != VideoStatus.PUBLISHED:
        from sqlalchemy.sql import func
        video.published_at = func.now()
    
    db.commit()
    db.refresh(video)
    
    video_dict = VideoResponse.model_validate(video).model_dump()
    video_dict["uploaded_by_name"] = video.uploaded_by.full_name if video.uploaded_by else None
    
    return custom_response(
        message="Video updated successfully",
        data={"video": video_dict}
    )

@router.delete("/{video_id}", response_model=dict)
async def delete_video(
    video_id: int,
    current_user: User = Depends(require_permission(Permission.VIDEO_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Delete video"""
    video = db.query(Video).filter(Video.id == video_id).first()
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Check permission (editor can only delete their own videos unless admin)
    if current_user.role != UserRole.ADMIN and video.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own videos"
        )
    
    # Delete associated file if self-hosted
    if video.video_type == VideoType.SELF_HOSTED and video.video_url:
        try:
            video_path = video.video_url.replace("/media/videos/", "")
            full_path = os.path.join("media/videos", video_path)
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            print(f"Error deleting video file: {e}")
    
    db.delete(video)
    db.commit()
    
    return custom_response(message="Video deleted successfully")

@router.post("/upload", response_model=dict)
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(require_permission(Permission.VIDEO_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Upload video file"""
    # Validate file
    validation_result = validate_video_file(file)
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result["error"]
        )
    
    # Save video file
    save_result = save_video_file(file)
    
    # Generate thumbnail
    thumbnail_url = None
    try:
        thumbnail_url = generate_thumbnail(save_result["file_path"])
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
    
    # Parse tags
    tag_list = []
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    # Create video record
    video = Video(
        title=title,
        description=description,
        video_type=VideoType.SELF_HOSTED,
        video_url=save_result["url"],
        thumbnail_url=thumbnail_url,
        file_size=save_result["file_size"],
        duration=save_result.get("duration"),
        format=save_result["file_extension"],
        category=category,
        tags=tag_list,
        uploaded_by_id=current_user.id,
        status=VideoStatus.DRAFT
    )
    
    db.add(video)
    db.commit()
    db.refresh(video)
    
    video_dict = VideoResponse.model_validate(video).model_dump()
    video_dict["uploaded_by_name"] = current_user.full_name
    
    return custom_response(
        message="Video uploaded successfully",
        data={"video": video_dict}
    )

@router.post("/bulk-update", response_model=dict)
async def bulk_update_videos(
    bulk_data: VideoBulkUpdate,
    current_user: User = Depends(require_permission(Permission.VIDEO_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk update videos"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No video IDs provided"
        )
    
    # Check permission for all videos
    if current_user.role != UserRole.ADMIN:
        user_videos = db.query(Video).filter(
            Video.id.in_(bulk_data.ids),
            Video.uploaded_by_id != current_user.id
        ).count()
        if user_videos > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own videos"
            )
    
    # Update videos
    update_data = bulk_data.dict(exclude_unset=True, exclude={"ids"})
    if update_data:
        db.query(Video).filter(Video.id.in_(bulk_data.ids)).update(update_data)
        db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} videos updated successfully"
    )

@router.post("/bulk-delete", response_model=dict)
async def bulk_delete_videos(
    bulk_data: VideoBulkDelete,
    current_user: User = Depends(require_permission(Permission.VIDEO_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk delete videos"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No video IDs provided"
        )
    
    # Check permission for all videos
    if current_user.role != UserRole.ADMIN:
        user_videos = db.query(Video).filter(
            Video.id.in_(bulk_data.ids),
            Video.uploaded_by_id != current_user.id
        ).count()
        if user_videos > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own videos"
            )
    
    # Delete videos
    db.query(Video).filter(Video.id.in_(bulk_data.ids)).delete(synchronize_session=False)
    db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} videos deleted successfully"
    )

@router.get("/stats/summary", response_model=dict)
async def get_video_stats(
    current_user: User = Depends(require_permission(Permission.VIDEO_READ)),
    db: Session = Depends(get_db)
) -> Any:
    """Get video statistics"""
    # Total videos
    total_videos = db.query(Video).count()
    
    # Published videos
    published_videos = db.query(Video).filter(Video.status == VideoStatus.PUBLISHED).count()
    
    # Total views
    total_views_result = db.query(func.sum(Video.views)).scalar() or 0
    
    # Average views
    avg_views = total_views_result / total_videos if total_videos > 0 else 0
    
    # Videos by category
    by_category = {}
    category_results = db.query(Video.category, func.count(Video.id)).group_by(Video.category).all()
    for category, count in category_results:
        if category:
            by_category[category] = count
    
    # Videos by country
    by_country = {}
    country_results = db.query(Video.country, func.count(Video.id)).group_by(Video.country).all()
    for country, count in country_results:
        if country:
            by_country[country] = count
    
    # Videos by status
    by_status = {}
    status_results = db.query(Video.status, func.count(Video.id)).group_by(Video.status).all()
    for status, count in status_results:
        by_status[status.value] = count
    
    stats = VideoStats(
        total_videos=total_videos,
        published_videos=published_videos,
        total_views=total_views_result,
        average_views=avg_views,
        by_category=by_category,
        by_country=by_country,
        by_status=by_status
    )
    
    return custom_response(data={"stats": stats.dict()})

@router.post("/{video_id}/like", response_model=dict)
async def like_video(
    video_id: int,
    db: Session = Depends(get_db)
) -> Any:
    """Like a video"""
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.status == VideoStatus.PUBLISHED
    ).first()
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    video.likes += 1
    db.commit()
    
    return custom_response(
        message="Video liked",
        data={"likes": video.likes}
    )

@router.post("/{video_id}/view", response_model=dict)
async def track_video_view(
    video_id: int,
    db: Session = Depends(get_db)
) -> Any:
    """Track video view"""
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.status == VideoStatus.PUBLISHED
    ).first()
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    video.views += 1
    db.commit()
    
    return custom_response(
        message="View tracked",
        data={"views": video.views}
    )