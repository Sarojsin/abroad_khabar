"""
Database session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings
from app.db.base import Base

# Create database engine
engine = create_engine(
    str(settings.DATABASE_URL),
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=3600,
    echo=settings.DEBUG
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Yields a SQLAlchemy session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_session() -> Session:
    """
    Get a database session without using dependency injection.
    Useful for background tasks or scripts.
    """
    return SessionLocal()

# Initialize database
def init_db() -> None:
    """
    Initialize database by creating all tables.
    This should be called once at application startup.
    """
    from app.models import user, blog, service, video, image, ads
    Base.metadata.create_all(bind=engine)

def drop_db() -> None:
    """
    Drop all tables. Use with caution!
    """
    Base.metadata.drop_all(bind=engine)