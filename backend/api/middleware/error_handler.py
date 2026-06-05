"""Exception handlers for API responses."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a consistent JSON payload for unhandled server errors.

    Args:
        request: The incoming FastAPI request object.
        exc: The exception raised while handling the request.

    Returns:
        A JSONResponse with an error message and HTTP status code 500.
    """
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "status": 500},
    )
