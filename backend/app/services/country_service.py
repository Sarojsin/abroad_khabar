from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..models.country import Country
from ..schemas.country import CountryCreate, CountryUpdate

class CountryService:
    def __init__(self, db: Session):
        self.db = db

    def get_countries(self, is_active: Optional[bool] = None) -> List[Country]:
        query = self.db.query(Country)
        if is_active is not None:
            query = query.filter(Country.is_active == is_active)
        return query.all()

    def get_country(self, country_id: int) -> Optional[Country]:
        return self.db.query(Country).filter(Country.id == country_id).first()

    def create_country(self, country_data: CountryCreate) -> Country:
        country = Country(**country_data.model_dump())
        self.db.add(country)
        self.db.commit()
        self.db.refresh(country)
        return country

    def update_country(self, country_id: int, country_data: CountryUpdate) -> Optional[Country]:
        country = self.get_country(country_id)
        if not country:
            return None
        
        update_data = country_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(country, key, value)
            
        country.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(country)
        return country

    def delete_country(self, country_id: int) -> bool:
        country = self.get_country(country_id)
        if not country:
            return False
        
        self.db.delete(country)
        self.db.commit()
        return True
