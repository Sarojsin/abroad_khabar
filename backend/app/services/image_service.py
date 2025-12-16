from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..models.image import Image
from ..schemas.image import ImageCreate, ImageUpdate

class ImageService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_images(
        self,
        category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Image]:
        """Get images with filters"""
        query = self.db.query(Image)
        
        if category:
            query = query.filter(Image.category == category)
        if is_active is not None:
            query = query.filter(Image.is_active == is_active)
        
        return query.order_by(Image.created_at.desc()).all()
    
    def create_image(self, image_data: ImageCreate, uploader_id: int) -> Image:
        """Create a new image record"""
        image = Image(**image_data.dict(), uploader_id=uploader_id)
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image
    
    def update_image(self, image_id: int, image_data: ImageUpdate) -> Optional[Image]:
        """Update image metadata"""
        image = self.db.query(Image).filter(Image.id == image_id).first()
        if not image:
            return None
        
        for key, value in image_data.dict(exclude_unset=True).items():
            setattr(image, key, value)
        
        self.db.commit()
        self.db.refresh(image)
        return image
    
    def delete_image(self, image_id: int) -> bool:
        """Delete image record"""
        image = self.db.query(Image).filter(Image.id == image_id).first()
        if not image:
            return False
        
        # Note: The actual file deletion should be handled separately
        # This just removes the database record
        
        self.db.delete(image)
        self.db.commit()
        return True
    
    def get_categories(self) -> List[str]:
        """Get unique image categories"""
        categories = self.db.query(Image.category).filter(
            Image.category.isnot(None),
            Image.is_active == True
        ).distinct().all()
        return [cat[0] for cat in categories if cat[0]]