from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..models.testimonial import Testimonial
from ..schemas.testimonial import TestimonialCreate, TestimonialUpdate

class TestimonialService:
    def __init__(self, db: Session):
        self.db = db

    def get_testimonials(self, is_approved: Optional[bool] = None, is_featured: Optional[bool] = None) -> List[Testimonial]:
        query = self.db.query(Testimonial)
        if is_approved is not None:
            query = query.filter(Testimonial.is_approved == is_approved)
        if is_featured is not None:
            query = query.filter(Testimonial.is_featured == is_featured)
        return query.order_by(Testimonial.created_at.desc()).all()

    def create_testimonial(self, testimonial_data: TestimonialCreate) -> Testimonial:
        testimonial = Testimonial(**testimonial_data.model_dump())
        self.db.add(testimonial)
        self.db.commit()
        self.db.refresh(testimonial)
        return testimonial

    def update_testimonial(self, testimonial_id: int, testimonial_data: TestimonialUpdate) -> Optional[Testimonial]:
        testimonial = self.db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
        if not testimonial:
            return None
        
        update_data = testimonial_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(testimonial, key, value)
            
        testimonial.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(testimonial)
        return testimonial

    def approve_testimonial(self, testimonial_id: int) -> bool:
        testimonial = self.db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
        if not testimonial:
            return False
        
        testimonial.is_approved = True
        testimonial.updated_at = datetime.utcnow()
        self.db.commit()
        return True
