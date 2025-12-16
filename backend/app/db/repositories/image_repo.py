from sqlalchemy.orm import Session
from typing import List, Optional

from ...models.image import Image

class ImageRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_id(self, image_id: int) -> Optional[Image]:
        """Find image by ID"""
        return self.db.query(Image).filter(Image.id == image_id).first()
    
    def find_all(
        self,
        category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Image]:
        """Find all images with filters"""
        query = self.db.query(Image)
        
        if category:
            query = query.filter(Image.category == category)
        if is_active is not None:
            query = query.filter(Image.is_active == is_active)
        
        return query.order_by(Image.created_at.desc()).all()
    
    def find_by_category(self, category: str) -> List[Image]:
        """Find images by category"""
        return self.db.query(Image).filter(
            Image.category == category,
            Image.is_active == True
        ).all()
    
    def find_recent(self, limit: int = 20) -> List[Image]:
        """Find recent images"""
        return self.db.query(Image).filter(
            Image.is_active == True
        ).order_by(Image.created_at.desc()).limit(limit).all()
    
    def get_categories(self) -> List[str]:
        """Get all unique categories"""
        categories = self.db.query(Image.category).filter(
            Image.category.isnot(None),
            Image.is_active == True
        ).distinct().all()
        return [cat[0] for cat in categories if cat[0]]
    
    def create(self, image_data: dict) -> Image:
        """Create new image"""
        image = Image(**image_data)
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image
    
    def update(self, image_id: int, image_data: dict) -> Optional[Image]:
        """Update image"""
        image = self.find_by_id(image_id)
        if not image:
            return None
        
        for key, value in image_data.items():
            setattr(image, key, value)
        
        self.db.commit()
        self.db.refresh(image)
        return image
    
    def delete(self, image_id: int) -> bool:
        """Delete image"""
        image = self.find_by_id(image_id)
        if not image:
            return False
        
        self.db.delete(image)
        self.db.commit()
        return True