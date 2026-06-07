"""Import QM9 into Supabase training_data and predictions_feedback safely."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from typing import Any, Iterable

import pandas as pd


BACKEND_ROOT = Path(__file__).resolve().parents[1]
ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.property_predictor import PropertyPredictor  # noqa: E402
from core.supabase_client import get_gateway  # noqa: E402
from scripts.download_qm9 import DEFAULT_OUTPUT, download_qm9  # noqa: E402


HARTREE_TO_EV = 27.2114
CHECKPOINT = ROOT / "ml" / "datasets" / "qm9_import_checkpoint.json"
PROPERTY_NAMES = ("band_gap", "homo", "lumo", "dipole_moment", "polarizability")


def load_env(path: Path = BACKEND_ROOT / ".env") -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        if "=" in raw and not raw.lstrip().startswith("#"):
            key, value = raw.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def qm9_properties(row: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Normalize QM9 training targets and convert Hartree energies to eV."""
    properties = {
        "band_gap": {"value": round(float(row["gap"]) * HARTREE_TO_EV, 6), "unit": "eV"},
        "homo": {"value": round(float(row["homo"]) * HARTREE_TO_EV, 6), "unit": "eV"},
        "lumo": {"value": round(float(row["lumo"]) * HARTREE_TO_EV, 6), "unit": "eV"},
        "dipole_moment": {"value": float(row["mu"]), "unit": "D"},
        "polarizability": {"value": float(row["alpha"]), "unit": "Bohr^3"},
    }
    if row.get("zpve") is not None:
        properties["zero_point_energy"] = {"value": round(float(row["zpve"]) * HARTREE_TO_EV, 6), "unit": "eV"}
    if row.get("u0") is not None:
        properties["internal_energy_0k"] = {"value": round(float(row["u0"]) * HARTREE_TO_EV, 6), "unit": "eV"}
    return properties


def _batches(rows: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for start in range(0, len(rows), size):
        yield rows[start : start + size]


def existing_hashes(gateway: Any, page_size: int = 1000) -> set[str]:
    """Load already imported QM9 hashes so a restarted import skips them."""
    hashes: set[str] = set()
    start = 0
    while True:
        page = gateway.table("training_data").select("smiles_hash").eq("source", "qm9_dataset").range(start, start + page_size - 1).execute().data
        hashes.update(row["smiles_hash"] for row in page if row.get("smiles_hash"))
        if len(page) < page_size:
            return hashes
        start += page_size


def import_qm9(csv_path: Path, limit: int | None = None, chunk_size: int = 1000, write_feedback: bool = True) -> dict[str, int]:
    """Import QM9 rows in restart-safe chunks."""
    load_env()
    gateway = get_gateway()
    if not gateway.service_available:
        raise RuntimeError("SUPABASE_SERVICE_KEY is required for the QM9 import.")
    known = existing_hashes(gateway)
    predictor = PropertyPredictor()
    imported = skipped = processed = 0
    for frame in pd.read_csv(csv_path, chunksize=chunk_size):
        training_rows: list[dict[str, Any]] = []
        feedback_rows: list[dict[str, Any]] = []
        for row in frame.to_dict(orient="records"):
            if limit is not None and processed >= limit:
                break
            processed += 1
            smiles = str(row["smiles"]).strip()
            smiles_hash = hashlib.md5(smiles.encode("utf-8")).hexdigest()
            if smiles_hash in known:
                skipped += 1
                continue
            properties = qm9_properties(row)
            training_rows.append(
                {
                    "smiles": smiles,
                    "properties": properties,
                    "source": "qm9_dataset",
                    "dataset": "QM9",
                    "quality_score": 1.0,
                    "calculation_method": "DFT B3LYP/6-31G(2df,p)",
                }
            )
            if write_feedback:
                try:
                    ml_band_gap = predictor.predict(smiles)["bandgap_ev"]["value"]
                except Exception:
                    ml_band_gap = None
                for property_name in PROPERTY_NAMES:
                    feedback_rows.append(
                        {
                            "molecule_id": None,
                            "user_id": None,
                            "property_name": property_name,
                            "predicted_value": ml_band_gap if property_name == "band_gap" else None,
                            "mp_actual_value": None,
                            "cloud_calculated_value": properties[property_name]["value"],
                            "rating": 5,
                            "source": "qm9_dataset",
                            "smiles": smiles,
                            "dataset": "QM9",
                        }
                    )
            known.add(smiles_hash)
        for batch in _batches(training_rows, 250):
            gateway.table("training_data").upsert(batch, on_conflict="smiles_hash,source").execute()
        for batch in _batches(feedback_rows, 500):
            gateway.table("predictions_feedback").insert(batch).execute()
        imported += len(training_rows)
        CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
        CHECKPOINT.write_text(json.dumps({"processed": processed, "imported": imported, "skipped": skipped}, indent=2), encoding="utf-8")
        if processed % 1000 == 0 or (limit is not None and processed >= limit):
            print(f"Imported {imported}/{processed} processed molecules ({skipped} skipped)")
        if limit is not None and processed >= limit:
            break
    return {"processed": processed, "imported": imported, "skipped": skipped}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_OUTPUT, help="Path to qm9.csv.")
    parser.add_argument("--limit", type=int, help="Optional molecule limit for a partial import.")
    parser.add_argument("--chunk-size", type=int, default=1000, help="CSV rows processed per chunk.")
    parser.add_argument("--no-feedback", action="store_true", help="Only populate training_data.")
    args = parser.parse_args()
    try:
        csv_path = args.csv if args.csv.exists() else download_qm9(args.csv)
        print(json.dumps(import_qm9(csv_path, args.limit, args.chunk_size, not args.no_feedback), indent=2))
        return 0
    except Exception as exc:
        print(f"QM9 import failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
