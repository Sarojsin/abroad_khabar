"""
Images API endpoints
"""
import os
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.permissions import require_permission, Permission
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.image import Image, ImageAlbum
from app.schemas.image import (
    ImageCreate,
    ImageUpdate,
    ImageResponse,
    ImageFilter,
    ImageBulkUpdate,
    ImageBulkDelete,
    ImageUploadResponse,
    MultiImageUpload,
    ImageAlbumCreate,
    ImageAlbumUpdate,
    ImageAlbumResponse,
    ImageStats
)
from app.utils.response import custom_response
from app.utils.file import save_image_file, validate_image_file, create_thumbnail
from app.core.security import get_current_user

router = APIRouter()

# Albums endpoints
@router.get("/albums", response_model=dict)
async def get_image_albums(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_public: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    include_images: bool = Query(False),
    sort_by: str = Query("created_at", regex="^(name|image_count|views|created_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
) -> Any:
    """Get image albums"""
    query = db.query(ImageAlbum)
    
    # Apply filters
    if search:
        query = query.filter(ImageAlbum.name.ilike(f"%{search}%"))
    if is_public is not None:
        query = query.filter(ImageAlbum.is_public == is_public)
    if is_featured is not None:
        query = query.filter(ImageAlbum.is_featured == is_featured)
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(ImageAlbum, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    # Apply pagination
    albums = query.offset(skip).limit(limit).all()
    
    # Format response
    album_responses = []
    for album in albums:
        album_dict = ImageAlbumResponse.model_validate(album).model_dump()
        album_dict["cover_image_url"] = album.cover_image.url if album.cover_image else None
        
        if include_images:
            images = db.query(Image).filter(Image.album_id == album.id).all()
            album_dict["images"] = [
                ImageResponse.model_validate(image).model_dump() 
                for image in images
            ]
        
        album_responses.append(album_dict)
    
    return custom_response(
        data={
            "albums": album_responses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/albums/{album_id}", response_model=dict)
async def get_image_album(
    album_id: int,
    include_images: bool = Query(True),
    db: Session = Depends(get_db)
) -> Any:
    """Get image album by ID"""
    album = db.query(ImageAlbum).filter(ImageAlbum.id == album_id).first()
    
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Increment views
    album.views += 1
    db.commit()
    
    album_dict = ImageAlbumResponse.model_validate(album).model_dump()
    album_dict["cover_image_url"] = album.cover_image.url if album.cover_image else None
    
    if include_images:
        images = db.query(Image).filter(Image.album_id == album.id).all()
        album_dict["images"] = [
            ImageResponse.model_validate(image).model_dump() 
            for image in images
        ]
    
    return custom_response(data={"album": album_dict})

@router.post("/albums", response_model=dict)
async def create_image_album(
    album_data: ImageAlbumCreate,
    current_user: User = Depends(require_permission(Permission.IMAGE_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new image album"""
    # Check if album with same name or slug exists
    existing_album = db.query(ImageAlbum).filter(
        (ImageAlbum.name == album_data.name) |
        (ImageAlbum.slug == album_data.slug)
    ).first()
    
    if existing_album:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Album with this name or slug already exists"
        )
    
    # Create album
    album = ImageAlbum(**album_data.dict())
    db.add(album)
    db.commit()
    db.refresh(album)
    
    return custom_response(
        message="Album created successfully",
        data={"album": ImageAlbumResponse.model_validate(album).model_dump()}
    )

@router.put("/albums/{album_id}", response_model=dict)
async def update_image_album(
    album_id: int,
    album_data: ImageAlbumUpdate,
    current_user: User = Depends(require_permission(Permission.IMAGE_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Update image album"""
    album = db.query(ImageAlbum).filter(ImageAlbum.id == album_id).first()
    
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Check if new name or slug conflicts with existing albums
    update_data = album_data.dict(exclude_unset=True)
    
    if "name" in update_data or "slug" in update_data:
        new_name = update_data.get("name", album.name)
        new_slug = update_data.get("slug", album.slug)
        
        conflicting_album = db.query(ImageAlbum).filter(
            (ImageAlbum.id != album_id) &
            ((ImageAlbum.name == new_name) | (ImageAlbum.slug == new_slug))
        ).first()
        
        if conflicting_album:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Album with this name or slug already exists"
            )
    
    # Update album
    for field, value in update_data.items():
        setattr(album, field, value)
    
    db.commit()
    db.refresh(album)
    
    album_dict = ImageAlbumResponse.model_validate(album).model_dump()
    album_dict["cover_image_url"] = album.cover_image.url if album.cover_image else None
    
    return custom_response(
        message="Album updated successfully",
        data={"album": album_dict}
    )

@router.delete("/albums/{album_id}", response_model=dict)
async def delete_image_album(
    album_id: int,
    current_user: User = Depends(require_permission(Permission.IMAGE_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Delete image album"""
    album = db.query(ImageAlbum).filter(ImageAlbum.id == album_id).first()
    
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Check if album has images
    image_count = db.query(Image).filter(Image.album_id == album_id).count()
    if image_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete album with images. Move or delete images first."
        )
    
    db.delete(album)
    db.commit()
    
    return custom_response(message="Album deleted successfully")

# Images endpoints
@router.get("/", response_model=dict)
async def get_images(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    category: Optional[str] = None,
    album_id: Optional[int] = None,
    tags: Optional[List[str]] = Query(None),
    format: Optional[str] = None,
    min_width: Optional[int] = Query(None, ge=1),
    min_height: Optional[int] = Query(None, ge=1),
    max_file_size: Optional[int] = Query(None, ge=0),
    sort_by: str = Query("created_at", regex="^(filename|file_size|width|height|created_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get images with filtering and pagination"""
    query = db.query(Image)
    
    # Apply filters
    if search:
        query = query.filter(
            (Image.filename.ilike(f"%{search}%")) |
            (Image.original_filename.ilike(f"%{search}%")) |
            (Image.alt_text.ilike(f"%{search}%")) |
            (Image.caption.ilike(f"%{search}%"))
        )
    
    if category:
        query = query.filter(Image.category == category)
    if album_id:
        query = query.filter(Image.album_id == album_id)
    if tags:
        for tag in tags:
            query = query.filter(Image.tags.contains([tag]))
    if format:
        query = query.filter(Image.format == format.lower())
    if min_width:
        query = query.filter(Image.width >= min_width)
    if min_height:
        query = query.filter(Image.height >= min_height)
    if max_file_size:
        query = query.filter(Image.file_size <= max_file_size)
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(Image, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    # Apply pagination
    images = query.offset(skip).limit(limit).all()
    
    # Format response
    image_responses = []
    for image in images:
        image_dict = ImageResponse.model_validate(image).model_dump()
        image_dict["uploaded_by_name"] = image.uploaded_by.full_name if image.uploaded_by else None
        image_dict["album_name"] = image.album.name if image.album else None
        image_responses.append(image_dict)
    
    return custom_response(
        data={
            "images": image_responses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    )

@router.get("/{image_id}", response_model=dict)
async def get_image(
    image_id: int,
    db: Session = Depends(get_db)
) -> Any:
    """Get image by ID"""
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    # Track usage
    image.usage_count += 1
    image.last_used = db.func.now()
    db.commit()
    
    image_dict = ImageResponse.model_validate(image).model_dump()
    image_dict["uploaded_by_name"] = image.uploaded_by.full_name if image.uploaded_by else None
    image_dict["album_name"] = image.album.name if image.album else None
    
    return custom_response(data={"image": image_dict})

@router.post("/", response_model=dict)
async def create_image(
    image_data: ImageCreate,
    current_user: User = Depends(require_permission(Permission.IMAGE_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new image record"""
    # Check if image with same filename exists
    existing_image = db.query(Image).filter(Image.filename == image_data.filename).first()
    if existing_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image with this filename already exists"
        )
    
    # Create image
    image = Image(
        **image_data.dict(exclude={"uploaded_by_id"}),
        uploaded_by_id=current_user.id
    )
    
    db.add(image)
    db.commit()
    db.refresh(image)
    
    # Update album image count if album specified
    if image.album_id:
        album_image_count = db.query(Image).filter(Image.album_id == image.album_id).count()
        db.query(ImageAlbum).filter(ImageAlbum.id == image.album_id).update(
            {"image_count": album_image_count}
        )
        db.commit()
    
    image_dict = ImageResponse.model_validate(image).model_dump()
    image_dict["uploaded_by_name"] = current_user.full_name
    
    return custom_response(
        message="Image created successfully",
        data={"image": image_dict}
    )

@router.post("/upload", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    album_id: Optional[int] = Form(None),
    alt_text: Optional[str] = Form(None),
    current_user: User = Depends(require_permission(Permission.IMAGE_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Upload image file"""
    # Validate file
    validation_result = validate_image_file(file)
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result["error"]
        )
    
    # Save image file
    save_result = save_image_file(file)
    
    # Create thumbnail
    thumbnail_url = None
    try:
        thumbnail_url = create_thumbnail(save_result["file_path"])
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
    
    # Parse tags
    tag_list = []
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    # Create image record
    image = Image(
        filename=save_result["filename"],
        original_filename=file.filename,
        url=save_result["url"],
        thumbnail_url=thumbnail_url,
        file_size=save_result["file_size"],
        width=save_result.get("width", 0),
        height=save_result.get("height", 0),
        format=save_result["file_extension"],
        alt_text=alt_text,
        category=category,
        tags=tag_list,
        album_id=album_id,
        uploaded_by_id=current_user.id
    )
    
    db.add(image)
    db.commit()
    db.refresh(image)
    
    # Update album image count if album specified
    if album_id:
        album_image_count = db.query(Image).filter(Image.album_id == album_id).count()
        db.query(ImageAlbum).filter(ImageAlbum.id == album_id).update(
            {"image_count": album_image_count}
        )
        db.commit()
    
    image_dict = ImageResponse.model_validate(image).model_dump()
    image_dict["uploaded_by_name"] = current_user.full_name
    
    return custom_response(
        message="Image uploaded successfully",
        data={"image": image_dict}
    )

@router.post("/upload-multiple", response_model=dict)
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    album_id: Optional[int] = Form(None),
    current_user: User = Depends(require_permission(Permission.IMAGE_CREATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Upload multiple image files"""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    uploaded_images = []
    failed_uploads = 0
    
    # Parse tags
    tag_list = []
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    for file in files:
        try:
            # Validate file
            validation_result = validate_image_file(file)
            if not validation_result["valid"]:
                failed_uploads += 1
                continue
            
            # Save image file
            save_result = save_image_file(file)
            
            # Create thumbnail
            thumbnail_url = None
            try:
                thumbnail_url = create_thumbnail(save_result["file_path"])
            except Exception as e:
                print(f"Error creating thumbnail: {e}")
            
            # Create image record
            image = Image(
                filename=save_result["filename"],
                original_filename=file.filename,
                url=save_result["url"],
                thumbnail_url=thumbnail_url,
                file_size=save_result["file_size"],
                width=save_result.get("width", 0),
                height=save_result.get("height", 0),
                format=save_result["file_extension"],
                category=category,
                tags=tag_list,
                album_id=album_id,
                uploaded_by_id=current_user.id
            )
            
            db.add(image)
            uploaded_images.append(image)
        
        except Exception as e:
            failed_uploads += 1
            print(f"Error uploading file {file.filename}: {e}")
    
    # Commit all successful uploads
    if uploaded_images:
        db.commit()
        
        # Update album image count if album specified
        if album_id:
            album_image_count = db.query(Image).filter(Image.album_id == album_id).count()
            db.query(ImageAlbum).filter(ImageAlbum.id == album_id).update(
                {"image_count": album_image_count}
            )
            db.commit()
    
    # Format response
    image_responses = []
    for image in uploaded_images:
        image_dict = ImageResponse.model_validate(image).model_dump()
        image_dict["uploaded_by_name"] = current_user.full_name
        image_responses.append(image_dict)
    
    return custom_response(
        message=f"Uploaded {len(uploaded_images)} images, failed: {failed_uploads}",
        data={
            "uploaded": len(uploaded_images),
            "failed": failed_uploads,
            "images": image_responses
        }
    )

@router.put("/{image_id}", response_model=dict)
async def update_image(
    image_id: int,
    image_data: ImageUpdate,
    current_user: User = Depends(require_permission(Permission.IMAGE_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Update image"""
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    # Check permission (editor can only edit their own images unless admin)
    if current_user.role != UserRole.ADMIN and image.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own images"
        )
    
    # Store old album for count update
    old_album_id = image.album_id
    
    # Update image
    update_data = image_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(image, field, value)
    
    db.commit()
    
    # Update album counts if album changed
    if old_album_id != image.album_id:
        # Update old album count
        if old_album_id:
            old_count = db.query(Image).filter(Image.album_id == old_album_id).count()
            db.query(ImageAlbum).filter(ImageAlbum.id == old_album_id).update(
                {"image_count": old_count}
            )
        
        # Update new album count
        if image.album_id:
            new_count = db.query(Image).filter(Image.album_id == image.album_id).count()
            db.query(ImageAlbum).filter(ImageAlbum.id == image.album_id).update(
                {"image_count": new_count}
            )
        
        db.commit()
    
    image_dict = ImageResponse.model_validate(image).model_dump()
    image_dict["uploaded_by_name"] = image.uploaded_by.full_name if image.uploaded_by else None
    
    return custom_response(
        message="Image updated successfully",
        data={"image": image_dict}
    )

@router.delete("/{image_id}", response_model=dict)
async def delete_image(
    image_id: int,
    current_user: User = Depends(require_permission(Permission.IMAGE_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Delete image"""
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    # Check permission (editor can only delete their own images unless admin)
    if current_user.role != UserRole.ADMIN and image.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own images"
        )
    
    # Store album for count update
    album_id = image.album_id
    
    # Delete file from storage
    try:
        image_path = image.url.replace("/media/images/", "")
        full_path = os.path.join("media/images", image_path)
        if os.path.exists(full_path):
            os.remove(full_path)
        
        # Delete thumbnail if exists
        if image.thumbnail_url:
            thumb_path = image.thumbnail_url.replace("/media/images/thumbnails/", "")
            thumb_full_path = os.path.join("media/images/thumbnails", thumb_path)
            if os.path.exists(thumb_full_path):
                os.remove(thumb_full_path)
    except Exception as e:
        print(f"Error deleting image files: {e}")
    
    db.delete(image)
    db.commit()
    
    # Update album image count
    if album_id:
        album_image_count = db.query(Image).filter(Image.album_id == album_id).count()
        db.query(ImageAlbum).filter(ImageAlbum.id == album_id).update(
            {"image_count": album_image_count}
        )
        db.commit()
    
    return custom_response(message="Image deleted successfully")

@router.post("/bulk-update", response_model=dict)
async def bulk_update_images(
    bulk_data: ImageBulkUpdate,
    current_user: User = Depends(require_permission(Permission.IMAGE_UPDATE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk update images"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image IDs provided"
        )
    
    # Check permission for all images
    if current_user.role != UserRole.ADMIN:
        user_images = db.query(Image).filter(
            Image.id.in_(bulk_data.ids),
            Image.uploaded_by_id != current_user.id
        ).count()
        if user_images > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own images"
            )
    
    # Update images
    update_data = bulk_data.dict(exclude_unset=True, exclude={"ids"})
    if update_data:
        db.query(Image).filter(Image.id.in_(bulk_data.ids)).update(update_data)
        db.commit()
    
    # Update album counts if album changed
    if "album_id" in update_data:
        album_counts = {}
        images = db.query(Image).filter(Image.id.in_(bulk_data.ids)).all()
        for image in images:
            if image.album_id:
                album_counts[image.album_id] = album_counts.get(image.album_id, 0) + 1
        
        for album_id, count in album_counts.items():
            total_count = db.query(Image).filter(Image.album_id == album_id).count()
            db.query(ImageAlbum).filter(ImageAlbum.id == album_id).update(
                {"image_count": total_count}
            )
        
        db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} images updated successfully"
    )

@router.post("/bulk-delete", response_model=dict)
async def bulk_delete_images(
    bulk_data: ImageBulkDelete,
    current_user: User = Depends(require_permission(Permission.IMAGE_DELETE)),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk delete images"""
    if not bulk_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image IDs provided"
        )
    
    # Check permission for all images
    if current_user.role != UserRole.ADMIN:
        user_images = db.query(Image).filter(
            Image.id.in_(bulk_data.ids),
            Image.uploaded_by_id != current_user.id
        ).count()
        if user_images > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own images"
            )
    
    # Get images to delete
    images = db.query(Image).filter(Image.id.in_(bulk_data.ids)).all()
    
    # Track albums for count update
    album_counts = {}
    for image in images:
        # Delete file from storage
        try:
            image_path = image.url.replace("/media/images/", "")
            full_path = os.path.join("media/images", image_path)
            if os.path.exists(full_path):
                os.remove(full_path)
            
            # Delete thumbnail if exists
            if image.thumbnail_url:
                thumb_path = image.thumbnail_url.replace("/media/images/thumbnails/", "")
                thumb_full_path = os.path.join("media/images/thumbnails", thumb_path)
                if os.path.exists(thumb_full_path):
                    os.remove(thumb_full_path)
        except Exception as e:
            print(f"Error deleting image files for {image.id}: {e}")
        
        # Track album for count update
        if image.album_id:
            album_counts[image.album_id] = album_counts.get(image.album_id, 0) + 1
    
    # Delete images
    db.query(Image).filter(Image.id.in_(bulk_data.ids)).delete(synchronize_session=False)
    db.commit()
    
    # Update album counts
    for album_id, count in album_counts.items():
        total_count = db.query(Image).filter(Image.album_id == album_id).count()
        db.query(ImageAlbum).filter(ImageAlbum.id == album_id).update(
            {"image_count": total_count}
        )
    
    db.commit()
    
    return custom_response(
        message=f"{len(bulk_data.ids)} images deleted successfully"
    )

@router.get("/stats/summary", response_model=dict)
async def get_image_stats(
    current_user: User = Depends(require_permission(Permission.IMAGE_READ)),
    db: Session = Depends(get_db)
) -> Any:
    """Get image statistics"""
    # Total images
    total_images = db.query(Image).count()
    
    # Total size
    total_size_result = db.query(func.sum(Image.file_size)).scalar() or 0
    
    # Images by category
    by_category = {}
    category_results = db.query(Image.category, func.count(Image.id)).group_by(Image.category).all()
    for category, count in category_results:
        if category:
            by_category[category] = count
    
    # Images by format
    by_format = {}
    format_results = db.query(Image.format, func.count(Image.id)).group_by(Image.format).all()
    for format_type, count in format_results:
        if format_type:
            by_format[format_type] = count
    
    # Recent uploads
    recent_uploads = db.query(Image).order_by(desc(Image.created_at)).limit(10).all()
    recent_uploads_list = [
        ImageResponse.model_validate(image).model_dump() 
        for image in recent_uploads
    ]
    
    stats = ImageStats(
        total_images=total_images,
        total_size=total_size_result,
        by_category=by_category,
        by_format=by_format,
        recent_uploads=recent_uploads_list
    )
    
    return custom_response(data={"stats": stats.dict()})