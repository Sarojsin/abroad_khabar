import sys
import os

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
# Import all models to resolve dependencies
from app.models.user import User
from app.models.blog import Blog
from app.models.ads import Advertisement
from app.models.image import Image
from app.models.homepage import HomepageSection
from app.models.service import Service
from app.models.video import Video
from app.models.testimonial import Testimonial

def check_images():
    db = SessionLocal()
    try:
        print("\n=== IMAGES AUDIT ===\n")
        
        print("--- Homepage Sections ---")
        sections = db.query(HomepageSection).all()
        for s in sections:
            print(f"Key: {s.key}")
            # Try to find image URLs in content dict
            if isinstance(s.content, dict):
                import json
                print(f"Content: {json.dumps(s.content, indent=2)}")
        
        print("\n--- Services ---")
        services = db.query(Service).all()
        for s in services:
            print(f"ID: {s.id}")
            print(f"Title: {s.title}")
            print(f"Icon: {s.icon}")
            print(f"Detail Image: {s.image_url}")  # Correct attribute matching schema
            print("---")

        print("\n--- Videos ---")
        videos = db.query(Video).all()
        for v in videos:
            print(f"ID: {v.id}")
            print(f"Title: {v.title}")
            print(f"Thumbnail: {v.thumbnail_url}")
            print("---")

        print("\n--- Testimonials ---")
        testimonials = db.query(Testimonial).all()
        for t in testimonials:
            print(f"Name: {t.author_name}")
            print(f"Avatar: {t.avatar_url}")
            print("---")

    except Exception as e:
        print(f"Error checking images: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_images()
