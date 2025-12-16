from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Tuple
from datetime import datetime, timedelta

from ...models.video import Video, VideoStatus

class VideoRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_id(self, video_id: int) -> Optional[Video]:
        """Find video by ID"""
        return self.db.query(Video).filter(Video.id == video_id).first()
    
    def find_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[VideoStatus] = None,
        category: Optional[str] = None,
        is_featured: Optional[bool] = None
    ) -> List[Video]:
        """Find all videos with pagination and filters"""
        query = self.db.query(Video)
        
        if status:
            query = query.filter(Video.status == status)
        if category:
            query = query.filter(Video.category == category)
        if is_featured is not None:
            query = query.filter(Video.is_featured == is_featured)
        
        return query.offset(skip).limit(limit).all()
    
    def find_by_service(self, service_id: int) -> List[Video]:
        """Find videos by service ID"""
        return self.db.query(Video).filter(
            Video.service_id == service_id,
            Video.status == VideoStatus.PUBLISHED
        ).all()
    
    def find_by_country(self, country_id: int) -> List[Video]:
        """Find videos by country ID"""
        return self.db.query(Video).filter(
            Video.country_id == country_id,
            Video.status == VideoStatus.PUBLISHED
        ).all()
    
    def find_featured(self, limit: int = 6) -> List[Video]:
        """Find featured videos"""
        return self.db.query(Video).filter(
            Video.is_featured == True,
            Video.status == VideoStatus.PUBLISHED
        ).order_by(Video.created_at.desc()).limit(limit).all()
    
    def find_recent(self, limit: int = 10) -> List[Video]:
        """Find recent videos"""
        return self.db.query(Video).filter(
            Video.status == VideoStatus.PUBLISHED
        ).order_by(Video.created_at.desc()).limit(limit).all()
    
    def find_popular(self, limit: int = 10) -> List[Video]:
        """Find popular videos by views"""
        return self.db.query(Video).filter(
            Video.status == VideoStatus.PUBLISHED
        ).order_by(Video.views.desc()).limit(limit).all()
    
    def search(self, query: str, limit: int = 20) -> List[Video]:
        """Search videos by title, description, or tags"""
        return self.db.query(Video).filter(
            Video.status == VideoStatus.PUBLISHED,
            or_(
                Video.title.ilike(f"%{query}%"),
                Video.description.ilike(f"%{query}%"),
                Video.tags.ilike(f"%{query}%")
            )
        ).limit(limit).all()
    
    def get_categories(self) -> List[str]:
        """Get all unique categories"""
        categories = self.db.query(Video.category).filter(
            Video.category.isnot(None),
            Video.status == VideoStatus.PUBLISHED
        ).distinct().all()
        return [cat[0] for cat in categories if cat[0]]
    
    def count_by_status(self, status: VideoStatus) -> int:
        """Count videos by status"""
        return self.db.query(Video).filter(Video.status == status).count()
    
    def increment_views(self, video_id: int) -> bool:
        """Increment video views"""
        video = self.find_by_id(video_id)
        if not video:
            return False
        
        video.views += 1
        self.db.commit()
        return True
    
    def create(self, video_data: dict) -> Video:
        """Create new video"""
        video = Video(**video_data)
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video
    
    def update(self, video_id: int, video_data: dict) -> Optional[Video]:
        """Update video"""
        video = self.find_by_id(video_id)
        if not video:
            return None
        
        for key, value in video_data.items():
            setattr(video, key, value)
        
        video.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(video)
        return video
    
    def delete(self, video_id: int) -> bool:
        """Delete video"""
        video = self.find_by_id(video_id)
        if not video:
            return False
        
        self.db.delete(video)
        self.db.commit()
        return True