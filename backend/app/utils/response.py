"""
Custom response utilities
"""
from typing import Any, Optional, Dict
from fastapi.responses import JSONResponse
from fastapi import status
from fastapi.encoders import jsonable_encoder

def custom_response(
    message: Optional[str] = None,
    data: Optional[Any] = None,
    success: bool = True,
    error: Optional[str] = None,
    status_code: int = status.HTTP_200_OK,
    meta: Optional[Dict] = None
) -> JSONResponse:
    """
    Create a standardized JSON response
    
    Args:
        message: Response message
        data: Response data
        success: Whether the request was successful
        error: Error message (if any)
        status_code: HTTP status code
        meta: Additional metadata
    
    Returns:
        JSONResponse with standardized format
    """
    response_data = {
        "success": success,
        "timestamp": "now",  # In production, use datetime.utcnow().isoformat()
    }
    
    if message:
        response_data["message"] = message
    
    if data is not None:
        response_data["data"] = data
    
    if error:
        response_data["error"] = error
    
    if meta:
        response_data["meta"] = meta
    
    return JSONResponse(
        content=jsonable_encoder(response_data),
        status_code=status_code
    )

def success_response(
    message: Optional[str] = None,
    data: Optional[Any] = None,
    status_code: int = status.HTTP_200_OK,
    meta: Optional[Dict] = None
) -> JSONResponse:
    """Create a success response"""
    return custom_response(
        message=message,
        data=data,
        success=True,
        status_code=status_code,
        meta=meta
    )

def error_response(
    message: str,
    error: Optional[str] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    data: Optional[Any] = None
) -> JSONResponse:
    """Create an error response"""
    return custom_response(
        message=message,
        data=data,
        success=False,
        error=error,
        status_code=status_code
    )

def created_response(
    message: str = "Resource created successfully",
    data: Optional[Any] = None,
    meta: Optional[Dict] = None
) -> JSONResponse:
    """Create a 201 Created response"""
    return success_response(
        message=message,
        data=data,
        status_code=status.HTTP_201_CREATED,
        meta=meta
    )

def not_found_response(
    message: str = "Resource not found",
    error: Optional[str] = None
) -> JSONResponse:
    """Create a 404 Not Found response"""
    return error_response(
        message=message,
        error=error,
        status_code=status.HTTP_404_NOT_FOUND
    )

def unauthorized_response(
    message: str = "Authentication required",
    error: Optional[str] = None
) -> JSONResponse:
    """Create a 401 Unauthorized response"""
    return error_response(
        message=message,
        error=error,
        status_code=status.HTTP_401_UNAUTHORIZED
    )

def forbidden_response(
    message: str = "Insufficient permissions",
    error: Optional[str] = None
) -> JSONResponse:
    """Create a 403 Forbidden response"""
    return error_response(
        message=message,
        error=error,
        status_code=status.HTTP_403_FORBIDDEN
    )

def validation_error_response(
    errors: Any,
    message: str = "Validation error"
) -> JSONResponse:
    """Create a 422 Validation Error response"""
    return error_response(
        message=message,
        error="Validation failed",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        data={"errors": errors}
    )

def paginated_response(
    items: list,
    total: int,
    page: int,
    per_page: int,
    message: Optional[str] = None
) -> JSONResponse:
    """Create a paginated response"""
    pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    
    meta = {
        "pagination": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1
        }
    }
    
    return success_response(
        message=message,
        data=items,
        meta=meta
    )