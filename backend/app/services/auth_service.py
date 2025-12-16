from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from ..models.user import User, UserRole
from ..schemas.user import UserCreate
from ..core.security import hash_password, verify_password

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        hashed_password = hash_password(user_data.password)
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role=user_data.role or UserRole.VIEWER
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def update_last_login(self, user_id: int) -> bool:
        """Update user's last login timestamp"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.last_login = datetime.utcnow()
        self.db.commit()
        return True
    
    @staticmethod
    def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
    ) -> User:
        """Get current user from token"""
        from ..core.security import verify_token
        
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        payload = verify_token(token)
        if not payload:
            raise credentials_exception
        
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise credentials_exception
        
        return user
    
    @staticmethod
    def get_current_admin_user(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Get current admin user"""
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user