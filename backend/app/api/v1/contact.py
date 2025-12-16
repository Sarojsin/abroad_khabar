"""
Contact API endpoints
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.permissions import require_permission, Permission, require_admin
from app.db.session import get_db
from app.models.contact import ContactSubmission
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate
from app.utils.response import custom_response

router = APIRouter()

@router.post("/", response_model=dict)
async def submit_contact_form(
    contact_data: ContactCreate,
    db: Session = Depends(get_db)
) -> Any:
    """Submit contact form"""
    # Create contact submission
    contact = ContactSubmission(**contact_data.dict())
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    # In production: Send email notification
    
    return custom_response(
        message="Thank you for your message. We'll get back to you soon.",
        data={"submission": ContactResponse.model_validate(contact).model_dump()}
    )

@router.get("/", response_model=dict)
async def get_contact_submissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: str = Query("all", regex="^(all|unread|read|replied)$"),
    search: Optional[str] = None,
    current_user: Any = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Any:
    """Get contact submissions (admin only)"""
    query = db.query(ContactSubmission)
    
    # Apply filters
    if status != "all":
        query = query.filter(ContactSubmission.status == status)
    
    if search:
        query = query.filter(
            (ContactSubmission.name.ilike(f"%{search}%")) |
            (ContactSubmission.email.ilike(f"%{search}%")) |
            (ContactSubmission.subject.ilike(f"%{search}%")) |
            (ContactSubmission.message.ilike(f"%{search}%"))
        )
    
    # Get total count
    total = query.count()
    
    # Apply sorting (newest first)
    query = query.order_by(desc(ContactSubmission.created_at))
    
    # Apply pagination
    submissions = query.offset(skip).limit(limit).all()
    
    return custom_response(
        data={
            "submissions": [ContactResponse.model_validate(sub).model_dump() for sub in submissions],
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/{submission_id}", response_model=dict)
async def get_contact_submission(
    submission_id: int,
    current_user: Any = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Any:
    """Get contact submission by ID (admin only)"""
    submission = db.query(ContactSubmission).filter(ContactSubmission.id == submission_id).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact submission not found"
        )
    
    # Mark as read when accessed
    if submission.status == "unread":
        submission.status = "read"
        db.commit()
    
    return custom_response(
        data={"submission": ContactResponse.model_validate(submission).model_dump()}
    )

@router.put("/{submission_id}", response_model=dict)
async def update_contact_submission(
    submission_id: int,
    update_data: ContactUpdate,
    current_user: Any = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Any:
    """Update contact submission (admin only)"""
    submission = db.query(ContactSubmission).filter(ContactSubmission.id == submission_id).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact submission not found"
        )
    
    # Update submission
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(submission, field, value)
    
    db.commit()
    db.refresh(submission)
    
    return custom_response(
        message="Contact submission updated successfully",
        data={"submission": ContactResponse.model_validate(submission).model_dump()}
    )

@router.delete("/{submission_id}", response_model=dict)
async def delete_contact_submission(
    submission_id: int,
    current_user: Any = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Any:
    """Delete contact submission (admin only)"""
    submission = db.query(ContactSubmission).filter(ContactSubmission.id == submission_id).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact submission not found"
        )
    
    db.delete(submission)
    db.commit()
    
    return custom_response(message="Contact submission deleted successfully")