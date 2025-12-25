"""
Security configuration and middleware
"""
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional
from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    if len(plain_password) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    # BCrypt has a max length limit of 72 bytes.
    # While we validate in schemas, we safeguard here too.
    if len(password) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[int] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = time.time() + expires_delta
    else:
        expire = time.time() + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = time.time() + (settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def decode_token(token: str) -> Optional[dict]:
    """Decode JWT token without verification (for debugging)"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_signature": False})
        return payload
    except JWTError:
        return None

async def get_current_user_payload(request: Request) -> Optional[dict]:
    """Get current user from request"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return None
        
        payload = verify_token(token)
        if not payload or payload.get("type") != "access":
            return None
        
        return payload
    except (ValueError, AttributeError):
        return None

# Security middleware
def setup_security_middleware(app: FastAPI):
    """Setup security middleware"""
    
    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        """Add security headers to responses"""
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # CSP: Allow Swagger UI resources while maintaining security
        # Swagger UI needs:
        # - External CSS/JS from CDNs (cdn.jsdelivr.net, fastapi.tiangolo.com)
        # - Inline styles and scripts ('unsafe-inline')
        # - Data URIs for images ('data:')
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
            "img-src 'self' data: cdn.jsdelivr.net; "
            "font-src 'self' data: cdn.jsdelivr.net; "
            "connect-src 'self'"
        )
        
        return response
    
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        """Simple rate limiting middleware"""
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host
        
        # Simple in-memory rate limiting (replace with Redis in production)
        # This is a simplified version
        request_count = getattr(request.app.state, f"rate_limit_{client_ip}", 0)
        
        if request_count >= settings.RATE_LIMIT_REQUESTS:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later."
            )
        
        # Increment count
        setattr(request.app.state, f"rate_limit_{client_ip}", request_count + 1)
        
        response = await call_next(request)
        return response