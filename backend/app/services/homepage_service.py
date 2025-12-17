from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
from ..models.homepage import HomepageSection

class HomepageService:
    def __init__(self, db: Session):
        self.db = db

    def get_homepage_content(self) -> Dict[str, Any]:
        sections = self.db.query(HomepageSection).all()
        # Return as dict {key: content}
        result = {}
        for section in sections:
            result[section.key] = {
                "content": section.content,
                "is_active": section.is_active
            }
        return result

    def _update_section_content(self, key: str, content: Dict[str, Any]) -> bool:
        section = self.db.query(HomepageSection).filter(HomepageSection.key == key).first()
        if not section:
            # Create if not exists
            section = HomepageSection(key=key, content=content)
            self.db.add(section)
        else:
            section.content = content
            section.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True

    def update_hero_section(self, hero_data: Dict[str, Any]) -> bool:
        return self._update_section_content("hero", hero_data)

    def update_counters(self, counters: Dict[str, int]) -> bool:
        return self._update_section_content("counters", counters)

    def toggle_section(self, section_name: str, enabled: bool) -> bool:
        section = self.db.query(HomepageSection).filter(HomepageSection.key == section_name).first()
        if not section:
            # Create it just to toggle? Or return False?
            # Usually we expect section to exist or be created default.
            # I'll create it with empty content.
            section = HomepageSection(key=section_name, content={}, is_active=enabled)
            self.db.add(section)
        else:
            section.is_active = enabled
            section.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True
