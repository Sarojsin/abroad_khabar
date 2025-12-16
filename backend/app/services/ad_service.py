from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime

from ..models.ads import Ad, AdStatus, AdType
from ..schemas.ads import AdCreate, AdUpdate

class AdService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_ads(
        self,
        ad_type: Optional[AdType] = None,
        status: Optional[AdStatus] = None,
        is_active: Optional[bool] = None,
        page: Optional[str] = None
    ) -> List[Ad]:
        """Get ads with filters"""
        query = self.db.query(Ad)
        
        if ad_type:
            query = query.filter(Ad.ad_type == ad_type)
        if status:
            query = query.filter(Ad.status == status)
        if is_active is not None:
            query = query.filter(Ad.is_active == is_active)
        if page:
            query = query.filter(
                or_(
                    Ad.pages.is_(None),
                    Ad.pages == "",
                    Ad.pages.ilike(f"%{page}%")
                )
            )
        
        return query.order_by(Ad.created_at.desc()).all()
    
    def get_active_ads(self, page: Optional[str] = None, position: Optional[str] = None) -> List[Ad]:
        """Get active ads that should be displayed"""
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
        
        # Check impression limits
        ads = []
        for ad in query.all():
            if ad.max_impressions is None or ad.current_impressions < ad.max_impressions:
                ads.append(ad)
        
        return ads
    
    def get_ad(self, ad_id: int) -> Optional[Ad]:
        """Get ad by ID"""
        return self.db.query(Ad).filter(Ad.id == ad_id).first()
    
    def create_ad(self, ad_data: AdCreate, created_by: int) -> Ad:
        """Create a new ad"""
        ad = Ad(**ad_data.dict(), created_by=created_by)
        self.db.add(ad)
        self.db.commit()
        self.db.refresh(ad)
        return ad
    
    def update_ad(self, ad_id: int, ad_data: AdUpdate) -> Optional[Ad]:
        """Update ad"""
        ad = self.get_ad(ad_id)
        if not ad:
            return None
        
        for key, value in ad_data.dict(exclude_unset=True).items():
            setattr(ad, key, value)
        
        ad.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(ad)
        return ad
    
    def delete_ad(self, ad_id: int) -> bool:
        """Delete ad"""
        ad = self.get_ad(ad_id)
        if not ad:
            return False
        
        self.db.delete(ad)
        self.db.commit()
        return True
    
    def record_impression(self, ad_id: int) -> bool:
        """Record an impression for an ad"""
        ad = self.get_ad(ad_id)
        if not ad:
            return False
        
        ad.current_impressions += 1
        self.db.commit()
        return True
    
    def record_click(self, ad_id: int) -> bool:
        """Record a click for an ad"""
        ad = self.get_ad(ad_id)
        if not ad:
            return False
        
        ad.current_clicks += 1
        self.db.commit()
        return True