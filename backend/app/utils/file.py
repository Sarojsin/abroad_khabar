"""
File handling utilities for uploads
"""
import os
import uuid
import uuid
# import magic  <-- Wrapped below
# try:
#     import magic
#     HAVE_MAGIC = True
# except ImportError:
#     HAVE_MAGIC = False
#     print("WARNING: python-magic not found, falling back to extension validation.")
# except Exception as e:
#     HAVE_MAGIC = False
#     print(f"WARNING: python-magic failed to load ({e}), falling back to extension validation.")
HAVE_MAGIC = False

from typing import Dict, Any, Optional
from fastapi import UploadFile, HTTPException
from PIL import Image as PILImage
import imageio
from app.core.config import settings

def validate_image_file(file: UploadFile) -> Dict[str, Any]:
    """Validate image file"""
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        return {
            "valid": False,
            "error": f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
        }
    
    # Check file type using magic
    mime = magic.Magic(mime=True)
    file.file.seek(0)
    mime_type = mime.from_buffer(file.file.read(1024))
    file.file.seek(0)
    
    # Extract extension
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    # Validate MIME type and extension
    if mime_type:
        valid_mime_types = [f"image/{ext}" for ext in settings.ALLOWED_IMAGE_TYPES]
        if mime_type not in valid_mime_types:
            return {
                "valid": False,
                "error": f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
            }
    
    if file_extension not in settings.ALLOWED_IMAGE_TYPES:
        return {
            "valid": False,
            "error": f"Invalid file extension. Allowed extensions: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
        }
    
    return {
        "valid": True,
        "file_size": file_size,
        "mime_type": mime_type,
        "file_extension": file_extension
    }

def validate_video_file(file: UploadFile) -> Dict[str, Any]:
    """Validate video file"""
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        return {
            "valid": False,
            "error": f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
        }
    
    # Check file type using magic
    mime = magic.Magic(mime=True)
    file.file.seek(0)
    mime_type = mime.from_buffer(file.file.read(1024))
    file.file.seek(0)
    
    # Extract extension
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    # Validate MIME type and extension
    if mime_type:
        valid_mime_types = [f"video/{ext}" for ext in settings.ALLOWED_VIDEO_TYPES]
        if not mime_type.startswith('video/'):
            return {
                "valid": False,
                "error": f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_VIDEO_TYPES)}"
            }
    
    if file_extension not in settings.ALLOWED_VIDEO_TYPES:
        return {
            "valid": False,
            "error": f"Invalid file extension. Allowed extensions: {', '.join(settings.ALLOWED_VIDEO_TYPES)}"
        }
    
    return {
        "valid": True,
        "file_size": file_size,
        "mime_type": mime_type,
        "file_extension": file_extension
    }

def save_image_file(file: UploadFile) -> Dict[str, Any]:
    """Save image file to disk"""
    # Generate unique filename
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    # Create directory if it doesn't exist
    os.makedirs(settings.IMAGES_DIR, exist_ok=True)
    
    # Save file
    file_path = os.path.join(settings.IMAGES_DIR, unique_filename)
    
    # Read file content
    file.file.seek(0)
    content = file.file.read()
    
    # Write to disk
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Get image dimensions if possible
    width, height = 0, 0
    try:
        with PILImage.open(file_path) as img:
            width, height = img.size
    except Exception as e:
        print(f"Error getting image dimensions: {e}")
    
    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_path": file_path,
        "url": f"/media/images/{unique_filename}",
        "file_size": len(content),
        "width": width,
        "height": height,
        "file_extension": file_extension
    }

def save_video_file(file: UploadFile) -> Dict[str, Any]:
    """Save video file to disk"""
    # Generate unique filename
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'mp4'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    # Create directory if it doesn't exist
    os.makedirs(settings.VIDEOS_DIR, exist_ok=True)
    
    # Save file
    file_path = os.path.join(settings.VIDEOS_DIR, unique_filename)
    
    # Read file content
    file.file.seek(0)
    content = file.file.read()
    
    # Write to disk
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Get video duration if possible
    duration = None
    try:
        reader = imageio.get_reader(file_path)
        duration = reader.get_meta_data().get('duration', None)
    except Exception as e:
        print(f"Error getting video duration: {e}")
    
    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_path": file_path,
        "url": f"/media/videos/{unique_filename}",
        "file_size": len(content),
        "duration": duration,
        "file_extension": file_extension
    }

def create_thumbnail(image_path: str, size: tuple = (300, 300)) -> Optional[str]:
    """Create thumbnail for image"""
    try:
        # Create thumbnails directory
        thumb_dir = os.path.join(settings.IMAGES_DIR, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        
        # Generate thumbnail filename
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        thumb_filename = f"{name}_thumb{ext}"
        thumb_path = os.path.join(thumb_dir, thumb_filename)
        
        # Create thumbnail
        with PILImage.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = PILImage.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = rgb_img
            
            # Create thumbnail
            img.thumbnail(size, PILImage.Resampling.LANCZOS)
            img.save(thumb_path, 'JPEG' if ext.lower() in ['.jpg', '.jpeg'] else 'PNG')
        
        return f"/media/images/thumbnails/{thumb_filename}"
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return None

def generate_thumbnail(video_path: str, time_sec: int = 10) -> Optional[str]:
    """Generate thumbnail from video"""
    try:
        # Create thumbnails directory
        thumb_dir = os.path.join(settings.VIDEOS_DIR, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        
        # Generate thumbnail filename
        filename = os.path.basename(video_path)
        name, ext = os.path.splitext(filename)
        thumb_filename = f"{name}_thumb.jpg"
        thumb_path = os.path.join(thumb_dir, thumb_filename)
        
        # Extract frame from video
        reader = imageio.get_reader(video_path)
        
        # Get frame at specified time
        fps = reader.get_meta_data().get('fps', 30)
        frame_num = int(time_sec * fps)
        
        try:
            frame = reader.get_data(frame_num)
        except (IndexError, ValueError):
            # If frame doesn't exist, get first frame
            frame = reader.get_data(0)
        
        # Save thumbnail
        imageio.imwrite(thumb_path, frame)
        
        return f"/media/videos/thumbnails/{thumb_filename}"
    except Exception as e:
        print(f"Error generating video thumbnail: {e}")
        return None

def delete_file(file_path: str) -> bool:
    """Delete file from disk"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")
    return False

def get_file_size(file_path: str) -> Optional[int]:
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except Exception:
        return None

def get_mime_type(file_path: str) -> Optional[str]:
    """Get MIME type of file"""
    try:
        if HAVE_MAGIC:
            mime = magic.Magic(mime=True)
            return mime.from_file(file_path)
    except Exception:
        pass
    return None