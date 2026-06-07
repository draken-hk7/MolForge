"""Run restart-safe parallel xTB calculations and store Native AI training rows."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import sys
import uuid
from typing import Any

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover
    tqdm = None


BACKEND_ROOT = Path(__file__).resolve().parents[1]
ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.cloud_compute.xtb_runner import XTBRunner  # noqa: E402
from core.supabase_client import get_gateway  # noqa: E402
from scripts.precompute_common import MOLECULES_TO_PRECOMPUTE  # noqa: E402


DEFAULT_OUTPUT = ROOT / "ml" / "datasets" / "xtb_results.json"


def load_env(path: Path = BACKEND_ROOT / ".env") -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        if "=" in raw and not raw.lstrip().startswith("#"):
            key, value = raw.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def get_molecule_list(target: int = 5000) -> list[str]:
    """Combine curated, sample, and local-QM9 molecules into a deduplicated batch."""
    values = [smiles for _, smiles in MOLECULES_TO_PRECOMPUTE]
    sample_path = BACKEND_ROOT / "data" / "sample_molecules.json"
    if sample_path.exists():
        values.extend(row["smiles"] for row in json.loads(sample_path.read_text(encoding="utf-8")) if row.get("smiles"))
    qm9_path = ROOT / "ml" / "datasets" / "qm9.csv"
    if qm9_path.exists() and len(values) < target:
        import pandas as pd

        values.extend(pd.read_csv(qm9_path, usecols=["smiles"], nrows=target)["smiles"].astype(str).tolist())
    return list(dict.fromkeys(value.strip() for value in values if str(value).strip()))[:target]


class BatchXTBCalculator:
    """Use all configured Oracle OCPUs through four parallel XTBRunner jobs."""

    def __init__(self, smiles_list: list[str], oracle_host: str = "", oracle_key: str = "", max_parallel: int = 4, output: Path = DEFAULT_OUTPUT) -> None:
        load_env()
        self.smiles_list = list(dict.fromkeys(smiles_list))
        self.max_parallel = max(1, max_parallel)
        self.output = Path(output)
        self.runner = XTBRunner()
        if oracle_host:
            self.runner.oracle_host = oracle_host
        if oracle_key:
            self.runner.oracle_key = oracle_key
        self.gateway = get_gateway()
        self.results = self._load_results()

    def _load_results(self) -> list[dict[str, Any]]:
        if not self.output.exists():
            return []
        try:
            return json.loads(self.output.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _save(self) -> None:
        self.output.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.output.with_suffix(".json.part")
        temporary.write_text(json.dumps(self.results, indent=2), encoding="utf-8")
        temporary.replace(self.output)

    def _calculate(self, smiles: str) -> dict[str, Any]:
        result = self.runner.run_calculation(smiles, f"batch-{uuid.uuid4().hex}", None)
        row = {"smiles": smiles, **result}
        if self.gateway.service_available:
            self.gateway.table("training_data").upsert(
                {
                    "smiles": smiles,
                    "properties": result.get("properties", {}),
                    "source": "xtb_batch",
                    "dataset": "xTB",
                    "quality_score": 0.85,
                    "calculation_method": result.get("method", "GFN2-xTB with ALPB water"),
                },
                on_conflict="smiles_hash,source",
            ).execute()
        return row

    def run_all(self) -> list[dict[str, Any]]:
        completed = {row.get("smiles") for row in self.results}
        pending = [smiles for smiles in self.smiles_list if smiles not in completed]
        progress = tqdm(total=len(pending), desc="xTB molecules", unit="molecule") if tqdm else None
        with ThreadPoolExecutor(max_workers=self.max_parallel) as executor:
            futures = {executor.submit(self._calculate, smiles): smiles for smiles in pending}
            for future in as_completed(futures):
                smiles = futures[future]
                try:
                    self.results.append(future.result())
                except Exception as exc:
                    self.results.append({"smiles": smiles, "error": str(exc)})
                self._save()
                if progress:
                    progress.update(1)
        if progress:
            progress.close()
        return self.results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=5000, help="Maximum molecules to calculate.")
    parser.add_argument("--max-parallel", type=int, default=4, help="Parallel Oracle/local xTB processes.")
    parser.add_argument("--oracle-host", default="", help="Override ORACLE_HOST.")
    parser.add_argument("--oracle-key", default="", help="Override ORACLE_SSH_KEY_PATH.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Crash-safe JSON results path.")
    args = parser.parse_args()
    calculator = BatchXTBCalculator(get_molecule_list(args.limit), args.oracle_host, args.oracle_key, args.max_parallel, args.output)
    if not calculator.runner.is_available():
        print(calculator.runner.install_xtb_instructions(), file=sys.stderr)
        return 2
    calculator.run_all()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
