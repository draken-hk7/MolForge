"""Oracle Always Free SSH compute adapter."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

try:
    import paramiko
except Exception:  # pragma: no cover
    paramiko = None


class OracleComputeClient:
    def __init__(self) -> None:
        self.host = os.getenv("ORACLE_HOST", "").strip()
        self.user = os.getenv("ORACLE_USER", "ubuntu").strip()
        self.key_path = os.getenv("ORACLE_SSH_KEY_PATH", "").strip()

    def is_available(self) -> bool:
        return bool(paramiko and self.host and self.key_path and Path(self.key_path).exists())

    def status(self) -> dict[str, Any]:
        return {"provider": "oracle", "available": self.is_available(), "host_set": bool(self.host)}

    def submit(self, command: str) -> str:
        if not self.is_available():
            raise RuntimeError("Oracle SSH compute is not configured.")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            client.connect(self.host, username=self.user, key_filename=self.key_path, timeout=15)
            _, stdout, stderr = client.exec_command(command, timeout=600)
            error = stderr.read().decode().strip()
            if error:
                raise RuntimeError(error)
            return stdout.read().decode()
        finally:
            client.close()
