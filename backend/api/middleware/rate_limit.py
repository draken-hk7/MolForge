"""Small in-process API rate limiter."""

from __future__ import annotations

from collections import defaultdict, deque
import os
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def configure_rate_limiting(app: FastAPI) -> None:
    """Limit requests per client IP without adding an external dependency."""
    maximum = int(os.getenv("MOLFORGE_RATE_LIMIT_PER_MINUTE", "180"))
    windows: dict[str, deque[float]] = defaultdict(deque)

    @app.middleware("http")
    async def rate_limit(request: Request, call_next):
        if request.url.path in {"/health", "/docs", "/openapi.json"}:
            return await call_next(request)
        now = time.monotonic()
        key = request.client.host if request.client else "unknown"
        bucket = windows[key]
        while bucket and bucket[0] < now - 60:
            bucket.popleft()
        if len(bucket) >= maximum:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again shortly."})
        bucket.append(now)
        return await call_next(request)
