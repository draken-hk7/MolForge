"""CORS middleware configuration helpers."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def configure_cors(app: FastAPI) -> None:
    """Attach CORS middleware to the FastAPI application.

    Args:
        app: The FastAPI app that should receive the middleware.

    Returns:
        None.
    """
    origins = os.getenv(
        "MOLFORGE_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
