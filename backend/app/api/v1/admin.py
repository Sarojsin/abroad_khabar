from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any
from app.db.session import get_db
from app.auth.dependencies import get_current_active_user
from app.models.user import User, UserRole
from app.models.service import Service
from app.models.video import Video
from app.models.blog import Blog

router = APIRouter()

async def get_current_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

@router.get("/dashboard/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Get admin dashboard statistics.
    Requires admin privileges.
    """
    total_users = db.query(User).count()
    total_services = db.query(Service).count()
    total_videos = db.query(Video).count()
    total_blogs = db.query(Blog).count()
    
    # Calculate some mock activity/response time for now
    response_time = 1.2  
    page_views = 15420 # Placeholder

    return {
        "totalUsers": total_users,
        "totalServices": total_services,
        "totalVideos": total_videos,
        "totalBlogs": total_blogs,
        "responseTime": response_time,
        "pageViews": page_views,
         # Mock recent activity for now, can be real later
        "recentActivity": [
            {
                "type": "info",
                "message": "System checks completed",
                "time": "Just now"
            }
        ],
         # Mock submissions for now
        "recentSubmissions": []
    }

@router.get("/notifications")
async def get_admin_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Get admin notifications.
    """
    # Placeholder for real notifications system
    return [
        {
            "id": 1,
            "type": "primary",
            "message": "Welcome to the new Admin Dashboard",
            "time": "Just now",
            "read": False
        }
    ]
