"""
Authentication dependencies
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth.jwt import verify_jwt_token, get_user_id_from_token
from app.db.session import get_db
from app.models.user import User, UserStatus

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current authenticated user from token"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    if not payload:
        return None
    
    user_id = get_user_id_from_token(payload)
    if not user_id:
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status != UserStatus.ACTIVE:
        return None
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user, raise error if not authenticated"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is not active"
        )
    
    return current_user

async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Get current admin user"""
    from app.models.user import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user

async def get_current_editor_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Get current editor or admin user"""
    from app.models.user import UserRole
    if current_user.role not in [UserRole.ADMIN, UserRole.EDITOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editor privileges required"
        )
    
    return current_user

def require_auth() -> User:
    """Dependency that requires authentication"""
    return Depends(get_current_active_user)

def require_admin() -> User:
    """Dependency that requires admin privileges"""
    return Depends(get_current_admin_user)

def require_editor() -> User:
    """Dependency that requires editor or admin privileges"""
    return Depends(get_current_editor_user)

def optional_auth() -> Optional[User]:
    """Dependency that allows optional authentication"""
    return Depends(get_current_user)