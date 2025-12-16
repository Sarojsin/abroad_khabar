"""
Authentication API endpoints
"""
from datetime import timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.security import (
    create_access_token, 
    create_refresh_token, 
    verify_password,
    verify_token,
    get_password_hash
)
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import (
    UserCreate, 
    UserResponse, 
    UserUpdate,
    Token,
    LoginRequest,
    RefreshTokenRequest
)
from app.utils.response import custom_response

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.status != UserStatus.ACTIVE:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user"""
    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/register", response_model=dict)
async def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """Register new user"""
    # Check if user exists
    user_exists = db.query(User).filter(
        (User.email == user_in.email) | (User.username == user_in.username)
    ).first()
    
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Create user
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=hashed_password,
        role=UserRole.USER,
        status=UserStatus.ACTIVE
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=access_token_expires.total_seconds()
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return custom_response(
        message="User registered successfully",
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer"
            }
        }
    )

@router.post("/login", response_model=dict)
async def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Login user"""
    # Find user by email or username
    user = db.query(User).filter(
        (User.email == login_data.email_or_username) | 
        (User.username == login_data.email_or_username)
    ).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password"
        )
    
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is not active"
        )
    
    # Update last login
    user.last_login = db.func.now()
    db.commit()
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=access_token_expires.total_seconds()
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return custom_response(
        message="Login successful",
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            }
        }
    )

@router.post("/refresh", response_model=dict)
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Refresh access token"""
    payload = verify_token(token_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=access_token_expires.total_seconds()
    )
    
    return custom_response(
        message="Token refreshed successfully",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    )

@router.get("/me", response_model=dict)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get current user information"""
    return custom_response(
        data={"user": UserResponse.model_validate(current_user).model_dump()}
    )

@router.put("/me", response_model=dict)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update current user profile"""
    # Check if email is being changed and if it's already taken
    if user_in.email and user_in.email != current_user.email:
        email_exists = db.query(User).filter(
            User.email == user_in.email,
            User.id != current_user.id
        ).first()
        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Check if username is being changed and if it's already taken
    if user_in.username and user_in.username != current_user.username:
        username_exists = db.query(User).filter(
            User.username == user_in.username,
            User.id != current_user.id
        ).first()
        if username_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update user fields
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return custom_response(
        message="Profile updated successfully",
        data={"user": UserResponse.model_validate(current_user).model_dump()}
    )

@router.post("/logout", response_model=dict)
async def logout_user(
    request: Request,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Logout user (client should delete tokens)"""
    # In a real application, you might want to add the token to a blacklist
    # For now, we'll just return success
    return custom_response(message="Logout successful")

@router.post("/forgot-password", response_model=dict)
async def forgot_password(
    email: str,
    db: Session = Depends(get_db)
) -> Any:
    """Request password reset"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal that user doesn't exist
        return custom_response(
            message="If an account exists with this email, a reset link will be sent"
        )
    
    # Generate password reset token
    reset_token_expires = timedelta(minutes=30)
    reset_token = create_access_token(
        data={"sub": str(user.id), "purpose": "password_reset"},
        expires_delta=reset_token_expires.total_seconds()
    )
    
    # In production: Send email with reset link
    # For now, return token (in production, don't return token in response)
    return custom_response(
        message="Password reset instructions sent",
        data={"reset_token": reset_token}  # Remove in production
    )

@router.post("/reset-password", response_model=dict)
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
) -> Any:
    """Reset password with token"""
    payload = verify_token(token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return custom_response(message="Password reset successful")

# Admin endpoints
@router.get("/users", response_model=dict)
async def get_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get all users (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    query = db.query(User)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.username.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    users = query.offset(skip).limit(limit).all()
    
    return custom_response(
        data={
            "users": [UserResponse.model_validate(user).model_dump() for user in users],
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )