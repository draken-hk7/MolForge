"""Benchmark MolForge local ML and optional xTB predictions against reference values."""

from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any


BACKEND_ROOT = Path(__file__).resolve().parents[1]
ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.cloud_compute.xtb_runner import XTBRunner  # noqa: E402
from core.property_predictor import PropertyPredictor  # noqa: E402


BENCHMARK_MOLECULES = {
    "c1ccccc1": {"bandgap_ev": 5.0, "source": "experimental"},
    "[Si]": {"bandgap_ev": 1.12, "source": "experimental"},
    "O": {"solubility_logS": 1.5, "source": "experimental"},
    "CCO": {"solubility_logS": 1.0, "source": "experimental"},
    "C": {"bandgap_ev": 9.8, "source": "experimental"},
    "CC": {"bandgap_ev": 8.8, "source": "experimental"},
    "CCC": {"bandgap_ev": 8.1, "source": "experimental"},
    "C=C": {"bandgap_ev": 7.6, "source": "experimental"},
    "C#C": {"bandgap_ev": 6.9, "source": "experimental"},
    "CO": {"solubility_logS": 0.8, "source": "experimental"},
    "CCCO": {"solubility_logS": 0.2, "source": "experimental"},
    "CCCCO": {"solubility_logS": -0.8, "source": "experimental"},
    "CC(=O)O": {"solubility_logS": 0.5, "source": "experimental"},
    "CC(=O)C": {"solubility_logS": 0.3, "source": "experimental"},
    "Oc1ccccc1": {"solubility_logS": -1.5, "source": "experimental"},
    "Cc1ccccc1": {"bandgap_ev": 4.6, "source": "experimental"},
    "c1ccc2ccccc2c1": {"bandgap_ev": 4.0, "source": "experimental"},
    "n1ccccc1": {"bandgap_ev": 4.7, "source": "experimental"},
    "c1ccoc1": {"bandgap_ev": 5.0, "source": "experimental"},
    "c1ccsc1": {"bandgap_ev": 4.6, "source": "experimental"},
    "N": {"solubility_logS": 1.3, "source": "experimental"},
    "NN": {"solubility_logS": 1.0, "source": "experimental"},
    "O=C=O": {"bandgap_ev": 8.5, "source": "experimental"},
    "CC#N": {"solubility_logS": 0.6, "source": "experimental"},
    "ClCCl": {"solubility_logS": -1.3, "source": "experimental"},
    "ClC(Cl)Cl": {"solubility_logS": -2.0, "source": "experimental"},
    "OCCO": {"solubility_logS": 1.2, "source": "experimental"},
    "OCC(O)CO": {"solubility_logS": 1.1, "source": "experimental"},
    "NCC(=O)O": {"solubility_logS": 0.7, "source": "experimental"},
    "CC(N)C(=O)O": {"solubility_logS": 0.4, "source": "experimental"},
    "NC(CCC(=O)O)C(=O)O": {"solubility_logS": 0.9, "source": "experimental"},
    "NC(=O)N": {"solubility_logS": 1.0, "source": "experimental"},
    "OO": {"solubility_logS": 1.4, "source": "experimental"},
    "CS(=O)C": {"solubility_logS": 1.0, "source": "experimental"},
    "CN(C)C=O": {"solubility_logS": 0.9, "source": "experimental"},
    "CN": {"solubility_logS": 1.2, "source": "experimental"},
    "CNC": {"solubility_logS": 1.0, "source": "experimental"},
    "CN(C)C": {"solubility_logS": 0.8, "source": "experimental"},
    "C1CCCCC1": {"bandgap_ev": 7.5, "source": "experimental"},
    "C1CCCC1": {"bandgap_ev": 7.8, "source": "experimental"},
    "Fc1ccccc1": {"bandgap_ev": 4.9, "source": "experimental"},
    "Clc1ccccc1": {"bandgap_ev": 4.7, "source": "experimental"},
    "Brc1ccccc1": {"bandgap_ev": 4.5, "source": "experimental"},
    "Nc1ccccc1": {"bandgap_ev": 4.2, "source": "experimental"},
    "O=C(O)c1ccccc1": {"solubility_logS": -1.9, "source": "experimental"},
    "O=C(O)c1ccccc1O": {"solubility_logS": -1.7, "source": "experimental"},
    "CCOC(=O)C": {"solubility_logS": -0.3, "source": "experimental"},
    "COC": {"solubility_logS": 0.2, "source": "experimental"},
    "CCOCC": {"solubility_logS": -0.7, "source": "experimental"},
    "O=CO": {"solubility_logS": 1.1, "source": "experimental"},
}


def _accuracy(prediction: float, known: float) -> float:
    error = abs(prediction - known) / max(abs(known), 0.1) * 100
    return round(max(0.0, 100.0 - error), 2)


class BenchmarkSuite:
    """Compare the active predictor and optional xTB runner against references."""

    def __init__(self, xtb: XTBRunner | None = None) -> None:
        self.xtb = xtb or XTBRunner()

    def run_benchmark(self, predictor: PropertyPredictor, limit: int | None = None) -> dict[str, Any]:
        rows = list(BENCHMARK_MOLECULES.items())[:limit]
        scores: dict[str, list[float]] = defaultdict(list)
        xtb_scores: dict[str, list[float]] = defaultdict(list)
        details = []
        for index, (smiles, reference) in enumerate(rows):
            property_name = next(key for key in reference if key != "source")
            known = float(reference[property_name])
            predicted = float(predictor.predict(smiles)[property_name]["value"])
            ml_score = _accuracy(predicted, known)
            scores[property_name].append(ml_score)
            xtb_score = None
            if self.xtb.is_available():
                try:
                    result = self.xtb.run_calculation(smiles, f"benchmark-{index}")
                    value = result.get("properties", {}).get(property_name, {}).get("value")
                    if value is not None:
                        xtb_score = _accuracy(float(value), known)
                        xtb_scores[property_name].append(xtb_score)
                except Exception:
                    pass
            details.append({"smiles": smiles, "property": property_name, "known": known, "ml": predicted, "ml_accuracy": ml_score, "xtb_accuracy": xtb_score})
        all_ml = [score for values in scores.values() for score in values]
        all_xtb = [score for values in xtb_scores.values() for score in values]
        return {
            "ml_accuracy": round(sum(all_ml) / len(all_ml), 2) if all_ml else 0.0,
            "xtb_accuracy": round(sum(all_xtb) / len(all_xtb), 2) if all_xtb else None,
            "n_molecules": len(rows),
            "per_property": {
                key: {
                    "ml": round(sum(values) / len(values), 2),
                    "xtb": round(sum(xtb_scores[key]) / len(xtb_scores[key]), 2) if xtb_scores[key] else None,
                }
                for key, values in scores.items()
            },
            "details": details,
        }


def save_benchmark_report(results: dict[str, Any], output_dir: Path | None = None) -> Path:
    output_dir = output_dir or ROOT / "ml" / "benchmarks"
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = output_dir / f"benchmark_{timestamp}.json"
    path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("MolForge Accuracy Benchmark")
    for name, values in results["per_property"].items():
        print(f"{name:24} ML: {values['ml']:6.2f}%  xTB: {values['xtb'] if values['xtb'] is not None else 'n/a'}")
    print(f"{'Overall':24} ML: {results['ml_accuracy']:6.2f}%  xTB: {results['xtb_accuracy'] if results['xtb_accuracy'] is not None else 'n/a'}")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=50, help="Maximum benchmark molecules.")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "ml" / "benchmarks", help="Report directory.")
    args = parser.parse_args()
    result = BenchmarkSuite().run_benchmark(PropertyPredictor(), args.limit)
    save_benchmark_report(result, args.output_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
