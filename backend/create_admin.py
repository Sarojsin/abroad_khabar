import sys
import os
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models import user, blog, service, video, image, ads, country, faq, testimonial, homepage
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "admin@abroadkhabar.com").first()
        if admin:
            print("Admin user already exists.")
            return

        # Create admin user
        admin = User(
            email="admin@abroadkhabar.com",
            username="admin",
            full_name="Admin User",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Admin user created successfully.")
        print(f"Email: {admin.email}")
        print(f"Password: admin123")
    except Exception as e:
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
