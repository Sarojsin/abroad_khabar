from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..models.faq import FAQ
from ..schemas.faq import FAQCreate, FAQUpdate

class FAQService:
    def __init__(self, db: Session):
        self.db = db

    def get_faqs(self, category: Optional[str] = None, is_active: Optional[bool] = None) -> List[FAQ]:
        query = self.db.query(FAQ)
        if category:
            query = query.filter(FAQ.category == category)
        if is_active is not None:
            query = query.filter(FAQ.is_active == is_active)
        return query.order_by(FAQ.position.asc(), FAQ.created_at.desc()).all()

    def get_categories(self) -> List[str]:
        # Get unique categories
        return [c[0] for c in self.db.query(FAQ.category).distinct().filter(FAQ.category != None).all()] # noqa

    def create_faq(self, faq_data: FAQCreate) -> FAQ:
        faq = FAQ(**faq_data.model_dump())
        self.db.add(faq)
        self.db.commit()
        self.db.refresh(faq)
        return faq

    def update_faq(self, faq_id: int, faq_data: FAQUpdate) -> Optional[FAQ]:
        faq = self.db.query(FAQ).filter(FAQ.id == faq_id).first()
        if not faq:
            return None
        
        update_data = faq_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(faq, key, value)
            
        faq.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(faq)
        return faq

    def delete_faq(self, faq_id: int) -> bool:
        faq = self.db.query(FAQ).filter(FAQ.id == faq_id).first()
        if not faq:
            return False
        
        self.db.delete(faq)
        self.db.commit()
        return True
