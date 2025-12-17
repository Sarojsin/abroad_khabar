"""
Main API Router
"""
from fastapi import APIRouter
from app.api.v1 import (
    auth,
    services,
    videos,
    images,
    ads,
    contact,
    countries,
    faq,
    homepage,
    testimonials
)

api_router = APIRouter()

# Include all API routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])
api_router.include_router(images.router, prefix="/images", tags=["Images"])
api_router.include_router(ads.router, prefix="/ads", tags=["Advertisements"])
api_router.include_router(contact.router, prefix="/contact", tags=["Contact"])
api_router.include_router(countries.router, prefix="/countries", tags=["Countries"])
api_router.include_router(faq.router, prefix="/faq", tags=["FAQ"])
api_router.include_router(homepage.router, prefix="/homepage", tags=["Homepage"])
api_router.include_router(testimonials.router, prefix="/testimonials", tags=["Testimonials"])



@api_router.get("/")
async def api_root():
    """API Root endpoint"""
    return {
        "message": "Educational Consultancy Platform API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/v1/auth",
            "blogs": "/api/v1/blogs",
            "services": "/api/v1/services",
            "videos": "/api/v1/videos",
            "images": "/api/v1/images",
            "ads": "/api/v1/ads",
            "contact": "/api/v1/contact",
            "countries": "/api/v1/countries",
            "faq": "/api/v1/faq",
            "homepage": "/api/v1/homepage",
            "testimonials": "/api/v1/testimonials",
            "seo": "/api/v1/seo",
            "stats": "/api/v1/stats"
        }
    }