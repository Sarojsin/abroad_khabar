"""
JWT authentication utilities
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings

def create_jwt_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    token_type: str = "access"
) -> str:
    """
    Create a JWT token
    
    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time
        token_type: Type of token (access/refresh)
    
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        if token_type == "access":
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        else:
            expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": token_type
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_jwt_token(token: str) -> Optional[dict]:
    """
    Verify a JWT token
    
    Args:
        token: JWT token to verify
    
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def decode_jwt_token(token: str, verify: bool = True) -> Optional[dict]:
    """
    Decode a JWT token
    
    Args:
        token: JWT token to decode
        verify: Whether to verify the token signature
    
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        if verify:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        else:
            payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except JWTError:
        return None

def create_access_token(data: dict) -> str:
    """Create an access token"""
    return create_jwt_token(data, token_type="access")

def create_refresh_token(data: dict) -> str:
    """Create a refresh token"""
    return create_jwt_token(data, token_type="refresh")

def is_token_expired(payload: dict) -> bool:
    """Check if token is expired"""
    exp = payload.get("exp")
    if not exp:
        return True
    
    return datetime.utcnow() > datetime.fromtimestamp(exp)

def get_token_type(payload: dict) -> Optional[str]:
    """Get token type from payload"""
    return payload.get("type")

def get_user_id_from_token(payload: dict) -> Optional[int]:
    """Get user ID from token payload"""
    user_id = payload.get("sub")
    if user_id:
        try:
            return int(user_id)
        except (ValueError, TypeError):
            return None
    return None

def create_password_reset_token(user_id: int) -> str:
    """Create a password reset token"""
    return create_jwt_token(
        {"sub": str(user_id), "purpose": "password_reset"},
        expires_delta=timedelta(minutes=30)
    )

def verify_password_reset_token(token: str) -> Optional[int]:
    """Verify a password reset token"""
    payload = verify_jwt_token(token)
    if not payload or payload.get("purpose") != "password_reset":
        return None
    
    return get_user_id_from_token(payload)