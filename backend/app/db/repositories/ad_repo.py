from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime

from ...models.ads import Ad, AdStatus, AdType

class AdRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_id(self, ad_id: int) -> Optional[Ad]:
        """Find ad by ID"""
        return self.db.query(Ad).filter(Ad.id == ad_id).first()
    
    def find_all(
        self,
        ad_type: Optional[AdType] = None,
        status: Optional[AdStatus] = None,
        is_active: Optional[bool] = None
    ) -> List[Ad]:
        """Find all ads with filters"""
        query = self.db.query(Ad)
        
        if ad_type:
            query = query.filter(Ad.ad_type == ad_type)
        if status:
            query = query.filter(Ad.status == status)
        if is_active is not None:
            query = query.filter(Ad.is_active == is_active)
        
        return query.order_by(Ad.created_at.desc()).all()
    
    def find_active(
        self,
        page: Optional[str] = None,
        position: Optional[str] = None
    ) -> List[Ad]:
        """Find active ads for display"""
        now = datetime.utcnow()
        query = self.db.query(Ad).filter(
            Ad.is_active == True,
            Ad.status == AdStatus.ACTIVE,
            or_(Ad.start_date.is_(None), Ad.start_date <= now),
            or_(Ad.end_date.is_(None), Ad.end_date >= now)
        )
        
        if page:
            query = query.filter(
                or_(
                    Ad.pages.is_(None),
                    Ad.pages == "",
                    Ad.pages.ilike(f"%{page}%")
                )
            )
        
        if position:
            query = query.filter(Ad.position == position)
        
        return query.all()
    
    def find_expired(self) -> List[Ad]:
        """Find expired ads"""
        now = datetime.utcnow()
        return self.db.query(Ad).filter(
            Ad.end_date.isnot(None),
            Ad.end_date < now,
            Ad.status == AdStatus.ACTIVE
        ).all()
    
    def find_scheduled(self) -> List[Ad]:
        """Find scheduled ads (future start date)"""
        now = datetime.utcnow()
        return self.db.query(Ad).filter(
            Ad.start_date > now,
            Ad.status == AdStatus.ACTIVE
        ).all()
    
    def record_impression(self, ad_id: int) -> bool:
        """Record ad impression"""
        ad = self.find_by_id(ad_id)
        if not ad:
            return False
        
        ad.current_impressions += 1
        self.db.commit()
        return True
    
    def record_click(self, ad_id: int) -> bool:
        """Record ad click"""
        ad = self.find_by_id(ad_id)
        if not ad:
            return False
        
        ad.current_clicks += 1
        self.db.commit()
        return True
    
    def create(self, ad_data: dict) -> Ad:
        """Create new ad"""
        ad = Ad(**ad_data)
        self.db.add(ad)
        self.db.commit()
        self.db.refresh(ad)
        return ad
    
    def update(self, ad_id: int, ad_data: dict) -> Optional[Ad]:
        """Update ad"""
        ad = self.find_by_id(ad_id)
        if not ad:
            return None
        
        for key, value in ad_data.items():
            setattr(ad, key, value)
        
        ad.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(ad)
        return ad
    
    def delete(self, ad_id: int) -> bool:
        """Delete ad"""
        ad = self.find_by_id(ad_id)
        if not ad:
            return False
        
        self.db.delete(ad)
        self.db.commit()
        return True