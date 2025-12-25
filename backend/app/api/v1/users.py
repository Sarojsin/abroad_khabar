from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash

router = APIRouter()

# Helper to get admin user
def get_current_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/")
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """
    Get all app users (admin only)
    """
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    
    if status:
        query = query.filter(User.status == status)
        
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) | 
            (User.email.ilike(f"%{search}%")) |
            (User.username.ilike(f"%{search}%"))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    # Remove sensitive data before returning
    users_data = []
    for user in users:
        user_dict = {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status,
            "created_at": user.created_at,
            "last_login": user.last_login
        }
        users_data.append(user_dict)
    
    return {
        "total": total,
        "items": users_data,
        "page": (skip // limit) + 1,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{user_id}")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a single user by ID - admin can see any, users can see themselves
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only admin or the user themselves can view
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user")
    
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "status": user.status,
        "created_at": user.created_at,
        "last_login": user.last_login
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new user (admin only)
    """
    # Check if user already exists
    existing = db.query(User).filter(
        (User.email == user_data.get("email")) | 
        (User.username == user_data.get("username"))
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="User with this email or username already exists"
        )
    
    new_user = User(
        email=user_data.get("email"),
        username=user_data.get("username"),
        full_name=user_data.get("full_name"),
        hashed_password=get_password_hash(user_data.get("password", "changeme123")),
        role=user_data.get("role", UserRole.USER),
        status=user_data.get("status", UserStatus.ACTIVE)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": new_user.id,
        "email": new_user.email,
        "username": new_user.username,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "status": new_user.status
    }

@router.put("/{user_id}")
async def update_user(
    user_id: int,
    user_data: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update a user (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update allowed fields
    for key in ["email", "username", "full_name", "role", "status"]:
        if key in user_data:
            setattr(user, key, user_data[key])
    
    # Update password if provided
    if "password" in user_data and user_data["password"]:
        user.hashed_password = get_password_hash(user_data["password"])
            
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "status": user.status
    }

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a user (admin only)
    """
    # Prevent deleting yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
