"""
Permission and role-based access control
"""
from enum import Enum
from fastapi import HTTPException, status, Depends
from typing import List, Optional, Any
from app.api.v1.auth import get_current_user

class UserRole(str, Enum):
    """User roles"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"
    USER = "user"

class Permission(str, Enum):
    """Permissions"""
    # User permissions
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    
    # Blog permissions
    BLOG_CREATE = "blog:create"
    BLOG_READ = "blog:read"
    BLOG_UPDATE = "blog:update"
    BLOG_DELETE = "blog:delete"
    BLOG_PUBLISH = "blog:publish"
    
    # Service permissions
    SERVICE_CREATE = "service:create"
    SERVICE_READ = "service:read"
    SERVICE_UPDATE = "service:update"
    SERVICE_DELETE = "service:delete"
    
    # Video permissions
    VIDEO_CREATE = "video:create"
    VIDEO_READ = "video:read"
    VIDEO_UPDATE = "video:update"
    VIDEO_DELETE = "video:delete"
    
    # Image permissions
    IMAGE_CREATE = "image:create"
    IMAGE_READ = "image:read"
    IMAGE_UPDATE = "image:update"
    IMAGE_DELETE = "image:delete"
    
    # Ad permissions
    AD_CREATE = "ad:create"
    AD_READ = "ad:read"
    AD_UPDATE = "ad:update"
    AD_DELETE = "ad:delete"
    
    # Media permissions
    MEDIA_UPLOAD = "media:upload"
    MEDIA_DELETE = "media:delete"

# Role to permissions mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        # User permissions
        Permission.USER_CREATE, Permission.USER_READ, 
        Permission.USER_UPDATE, Permission.USER_DELETE,
        
        # Blog permissions
        Permission.BLOG_CREATE, Permission.BLOG_READ, 
        Permission.BLOG_UPDATE, Permission.BLOG_DELETE, Permission.BLOG_PUBLISH,
        
        # Service permissions
        Permission.SERVICE_CREATE, Permission.SERVICE_READ, 
        Permission.SERVICE_UPDATE, Permission.SERVICE_DELETE,
        
        # Video permissions
        Permission.VIDEO_CREATE, Permission.VIDEO_READ, 
        Permission.VIDEO_UPDATE, Permission.VIDEO_DELETE,
        
        # Image permissions
        Permission.IMAGE_CREATE, Permission.IMAGE_READ, 
        Permission.IMAGE_UPDATE, Permission.IMAGE_DELETE,
        
        # Ad permissions
        Permission.AD_CREATE, Permission.AD_READ, 
        Permission.AD_UPDATE, Permission.AD_DELETE,
        
        # Media permissions
        Permission.MEDIA_UPLOAD, Permission.MEDIA_DELETE,
    ],
    UserRole.EDITOR: [
        # Blog permissions
        Permission.BLOG_CREATE, Permission.BLOG_READ, 
        Permission.BLOG_UPDATE, Permission.BLOG_DELETE, Permission.BLOG_PUBLISH,
        
        # Service permissions (read only)
        Permission.SERVICE_READ,
        
        # Video permissions
        Permission.VIDEO_CREATE, Permission.VIDEO_READ, 
        Permission.VIDEO_UPDATE, Permission.VIDEO_DELETE,
        
        # Image permissions
        Permission.IMAGE_CREATE, Permission.IMAGE_READ, 
        Permission.IMAGE_UPDATE, Permission.IMAGE_DELETE,
        
        # Media permissions
        Permission.MEDIA_UPLOAD,
    ],
    UserRole.VIEWER: [
        # Read only permissions
        Permission.BLOG_READ,
        Permission.SERVICE_READ,
        Permission.VIDEO_READ,
        Permission.IMAGE_READ,
        Permission.AD_READ,
    ],
    UserRole.USER: [
        # Basic user permissions
        Permission.BLOG_READ,
        Permission.SERVICE_READ,
        Permission.VIDEO_READ,
    ]
}

def has_permission(user: Any, permission: Permission) -> bool:
    """Check if user has specific permission"""
    if not user:
        return False
    
    # Handle both User object and payload dict
    user_role = getattr(user, "role", None)
    if user_role is None and isinstance(user, dict):
        user_role = user.get("role")
    
    if not user_role:
        return False
        
    # Convert string role to enum if necessary
    if isinstance(user_role, str):
        try:
            user_role = UserRole(user_role)
        except ValueError:
            return False
    
    return permission in ROLE_PERMISSIONS.get(user_role, [])

def require_permission(permission: Permission):
    """Dependency to require specific permission"""
    async def permission_dependency(user: Any = Depends(get_current_user)):
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        if not has_permission(user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return user
    
    return permission_dependency

def require_role(role: UserRole):
    """Dependency to require specific role"""
    async def role_dependency(user: Any = Depends(get_current_user)):
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        user_role = getattr(user, "role", None)
        if user_role is None and isinstance(user, dict):
            user_role = user.get("role")

        if user_role != role and user_role != role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {role.value} role"
            )
        
        return user
    
    return role_dependency

# Common permission dependencies
require_admin = require_role(UserRole.ADMIN)
require_editor = require_role(UserRole.EDITOR)

# Common permission checks
can_create_blog = require_permission(Permission.BLOG_CREATE)
can_publish_blog = require_permission(Permission.BLOG_PUBLISH)
can_upload_media = require_permission(Permission.MEDIA_UPLOAD)
can_manage_users = require_permission(Permission.USER_CREATE)