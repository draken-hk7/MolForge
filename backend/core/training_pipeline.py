"""Admin-triggered Native AI data generation pipeline runs."""

from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess
import sys
from threading import Lock, Thread
import uuid
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = ROOT / "ml" / "logs"


class TrainingPipelineManager:
    """Launch long-running training data jobs without blocking the API."""

    ACTIONS = {
        "qm9": ("Import QM9", ROOT / "backend" / "scripts" / "import_qm9.py"),
        "xtb": ("Run xTB batch", ROOT / "backend" / "scripts" / "batch_xtb.py"),
        "benchmark": ("Run benchmark", ROOT / "backend" / "scripts" / "benchmark.py"),
    }

    def __init__(self) -> None:
        self.runs: dict[str, dict[str, Any]] = {}
        self._lock = Lock()

    def start(self, action: str, limit: int | None = None) -> dict[str, Any]:
        """Start one supported pipeline action in a background thread."""
        if action not in self.ACTIONS:
            raise ValueError(f"Unsupported training action '{action}'.")
        run_id = str(uuid.uuid4())
        label, script = self.ACTIONS[action]
        run = {
            "id": run_id,
            "action": action,
            "label": label,
            "status": "queued",
            "limit": limit,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "exit_code": None,
            "log_path": None,
        }
        with self._lock:
            self.runs[run_id] = run
        Thread(target=self._execute, args=(run_id, script), daemon=True, name=f"molforge-training-{action}").start()
        return dict(run)

    def list_runs(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return recent runs without exposing local filesystem paths."""
        values = list(reversed(list(self.runs.values())))[:limit]
        return [{key: value for key, value in run.items() if key != "log_path"} for run in values]

    def _execute(self, run_id: str, script: Path) -> None:
        run = self.runs[run_id]
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / f"{run['action']}_{run_id}.log"
        command = [sys.executable, str(script)]
        if run["limit"] is not None:
            command.extend(["--limit", str(run["limit"])])
        self._update(run_id, status="running", log_path=str(log_path))
        try:
            with log_path.open("w", encoding="utf-8") as log:
                result = subprocess.run(
                    command,
                    cwd=ROOT,
                    env=os.environ.copy(),
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    check=False,
                )
            self._update(
                run_id,
                status="completed" if result.returncode == 0 else "failed",
                exit_code=result.returncode,
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception:
            self._update(
                run_id,
                status="failed",
                exit_code=-1,
                completed_at=datetime.now(timezone.utc).isoformat(),
            )

    def _update(self, run_id: str, **values: Any) -> None:
        with self._lock:
            self.runs[run_id].update(values)
