"""Optional Google Cloud Compute status adapter."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any


class GCPComputeClient:
    def __init__(self) -> None:
        self.project_id = os.getenv("GCP_PROJECT_ID", "").strip()
        self.credentials_path = os.getenv("GCP_CREDENTIALS_PATH", "").strip()

    def is_available(self) -> bool:
        return bool(self.project_id and self.credentials_path and Path(self.credentials_path).exists())

    def status(self) -> dict[str, Any]:
        return {"provider": "gcp", "available": self.is_available(), "project_set": bool(self.project_id)}
