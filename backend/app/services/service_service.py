from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..models.service import Service
from ..schemas.service import ServiceCreate, ServiceUpdate

class ServiceService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_services(
        self,
        is_active: Optional[bool] = None,
        is_popular: Optional[bool] = None
    ) -> List[Service]:
        """Get services with filters"""
        query = self.db.query(Service)
        
        if is_active is not None:
            query = query.filter(Service.is_active == is_active)
        if is_popular is not None:
            query = query.filter(Service.is_popular == is_popular)
        
        return query.order_by(Service.order.asc(), Service.created_at.desc()).all()
    
    def get_service(self, service_id: int) -> Optional[Service]:
        """Get service by ID"""
        return self.db.query(Service).filter(Service.id == service_id).first()
    
    def get_service_by_slug(self, slug: str) -> Optional[Service]:
        """Get service by slug"""
        return self.db.query(Service).filter(Service.slug == slug).first()
    
    def create_service(self, service_data: ServiceCreate) -> Service:
        """Create a new service"""
        service = Service(**service_data.dict())
        self.db.add(service)
        self.db.commit()
        self.db.refresh(service)
        return service
    
    def update_service(self, service_id: int, service_data: ServiceUpdate) -> Optional[Service]:
        """Update service"""
        service = self.get_service(service_id)
        if not service:
            return None
        
        for key, value in service_data.dict(exclude_unset=True).items():
            setattr(service, key, value)
        
        service.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(service)
        return service
    
    def delete_service(self, service_id: int) -> bool:
        """Delete service"""
        service = self.get_service(service_id)
        if not service:
            return False
        
        self.db.delete(service)
        self.db.commit()
        return True
    
    def toggle_active(self, service_id: int) -> bool:
        """Toggle service active status"""
        service = self.get_service(service_id)
        if not service:
            return False
        
        service.is_active = not service.is_active
        service.updated_at = datetime.utcnow()
        self.db.commit()
        return True
    
    def toggle_popular(self, service_id: int) -> bool:
        """Toggle service popular status"""
        service = self.get_service(service_id)
        if not service:
            return False
        
        service.is_popular = not service.is_popular
        service.updated_at = datetime.utcnow()
        self.db.commit()
        return True