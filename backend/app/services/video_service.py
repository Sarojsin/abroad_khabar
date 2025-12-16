from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime

from ..models.video import Video, VideoStatus
from ..schemas.video import VideoCreate, VideoUpdate

class VideoService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_videos(
        self,
        page: int = 1,
        per_page: int = 10,
        status: Optional[VideoStatus] = None,
        category: Optional[str] = None,
        is_featured: Optional[bool] = None,
        service_id: Optional[int] = None,
        country_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> tuple[List[Video], int]:
        """Get paginated videos with filters"""
        query = self.db.query(Video)
        
        if status:
            query = query.filter(Video.status == status)
        if category:
            query = query.filter(Video.category == category)
        if is_featured is not None:
            query = query.filter(Video.is_featured == is_featured)
        if service_id:
            query = query.filter(Video.service_id == service_id)
        if country_id:
            query = query.filter(Video.country_id == country_id)
        if search:
            query = query.filter(
                or_(
                    Video.title.ilike(f"%{search}%"),
                    Video.description.ilike(f"%{search}%"),
                    Video.tags.ilike(f"%{search}%")
                )
            )
        
        # Only show published videos to non-admin users
        query = query.filter(Video.status == VideoStatus.PUBLISHED)
        
        total = query.count()
        videos = query.order_by(Video.created_at.desc()) \
                     .offset((page - 1) * per_page) \
                     .limit(per_page) \
                     .all()
        
        return videos, total
    
    def get_featured_videos(self) -> List[Video]:
        """Get featured videos"""
        return self.db.query(Video).filter(
            Video.is_featured == True,
            Video.status == VideoStatus.PUBLISHED
        ).order_by(Video.created_at.desc()).limit(6).all()
    
    def get_video(self, video_id: int) -> Optional[Video]:
        """Get video by ID"""
        return self.db.query(Video).filter(Video.id == video_id).first()
    
    def create_video(self, video_data: VideoCreate, uploader_id: int) -> Video:
        """Create a new video"""
        video = Video(**video_data.dict(), uploader_id=uploader_id)
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video
    
    def update_video(self, video_id: int, video_data: VideoUpdate) -> Optional[Video]:
        """Update video"""
        video = self.get_video(video_id)
        if not video:
            return None
        
        for key, value in video_data.dict(exclude_unset=True).items():
            setattr(video, key, value)
        
        video.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(video)
        return video
    
    def delete_video(self, video_id: int) -> bool:
        """Delete video"""
        video = self.get_video(video_id)
        if not video:
            return False
        
        self.db.delete(video)
        self.db.commit()
        return True
    
    def increment_views(self, video_id: int) -> bool:
        """Increment video view count"""
        video = self.get_video(video_id)
        if not video:
            return False
        
        video.views += 1
        self.db.commit()
        return True
    
    def increment_likes(self, video_id: int) -> bool:
        """Increment video like count"""
        video = self.get_video(video_id)
        if not video:
            return False
        
        video.likes += 1
        self.db.commit()
        return True
    
    def get_categories(self) -> List[str]:
        """Get unique video categories"""
        categories = self.db.query(Video.category).filter(
            Video.category.isnot(None),
            Video.status == VideoStatus.PUBLISHED
        ).distinct().all()
        return [cat[0] for cat in categories if cat[0]]