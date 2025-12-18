"""
Main FastAPI Application
Educational Consultancy Platform Backend
"""
import sys
import os

# Ensure backend dir is in path for script execution
sys.path.append(os.getcwd())

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import engine, Base, init_db
from app.api.v1.api import api_router
from app.core.security import setup_security_middleware
from app.utils.response import custom_response

# Create tables in the database - MOVED TO LIFESPAN

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for the application"""
    print("Starting up...")
    try:
        print("Initializing database...")
        init_db()
        print("Database initialized.")
    except Exception as e:
        print(f"Database initialization failed: {e}")
    yield
    print("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Educational Consultancy Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",  # Always enable Swagger UI for testing
    redoc_url="/redoc",  # Always enable ReDoc for testing
    lifespan=lifespan
)

# Setup CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Setup security middleware
setup_security_middleware(app)

# Mount static files for media
if os.path.exists(settings.MEDIA_ROOT):
    app.mount(
        "/media",
        StaticFiles(directory=settings.MEDIA_ROOT),
        name="media"
    )

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# @app.get("/")
# async def root():
#     """Root endpoint"""
#     return custom_response(
#         message="Educational Consultancy Platform API",
#         data={
#             "version": settings.VERSION,
#             "docs": "/docs" if settings.DEBUG else None,
#             "status": "operational"
#         }
#     )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": "now"}

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return custom_response(
        success=False,
        message="Internal server error",
        error=str(exc),
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


# Mount frontend
# NOTE: Mounting at "/" will catch ALL routes including /docs, /redoc, /openapi.json
# To serve frontend AND keep /docs working, we have a few options:
# 1. Mount frontend at a specific path like /app or /web
# 2. Use a middleware to handle routing priority
# 3. Don't mount frontend here if using a separate frontend server
# 
# For now, commenting out to allow /docs to work. 
# Use a separate static file server or configure nginx/apache for production.

from pathlib import Path

# .../backend/app/main.py -> .../backend/app -> .../backend -> .../
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# Temporarily disabled to allow /docs to work
# if FRONTEND_DIR.exists():
#     app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
# else:
#     print(f"WARNING: Frontend directory not found at {FRONTEND_DIR}")

if __name__ == "__main__":
    print("Imports complete. Starting uvicorn...")
    try:
        import uvicorn
        print("Uvicorn imported. Running...")
        uvicorn.run(
            app,
            host="0.0.0.0",#http://localhost:8002/docs
            port=8002,
            reload=False,
            log_level="info"
        )
    except Exception as e:
        print(f"Failed to start uvicorn: {e}")