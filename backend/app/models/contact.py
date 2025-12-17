from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.db.base import Base

class ContactSubmission(Base):
    __tablename__ = "contact_submissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, index=True)
    subject = Column(String)
    message = Column(Text)
    status = Column(String, default="unread")  # unread, read, replied
    created_at = Column(DateTime(timezone=True), server_default=func.now())
