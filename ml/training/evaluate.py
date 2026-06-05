"""Evaluate MolForge prediction artifacts against curated samples."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def evaluate_samples(project_root: Path) -> dict[str, object]:
    """Evaluate fallback predictions against available known properties.

    Args:
        project_root: Repository root path.

    Returns:
        Evaluation summary containing absolute errors by property.
    """
    backend_root = project_root / "backend"
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

    from core.property_predictor import PropertyPredictor

    samples = json.loads((backend_root / "data" / "sample_molecules.json").read_text(encoding="utf-8"))
    predictor = PropertyPredictor()
    errors: dict[str, list[float]] = {}
    for row in samples:
        prediction = predictor.predict(row["smiles"])
        for key, known in row.get("known_properties", {}).items():
            if key in prediction:
                errors.setdefault(key, []).append(abs(float(prediction[key]["value"]) - float(known)))
    return {
        "samples": len(samples),
        "mean_absolute_error": {
            key: round(sum(values) / len(values), 5)
            for key, values in errors.items()
            if values
        }
    }


def main() -> None:
    """Run model evaluation.

    Args:
        None.

    Returns:
        None.
    """
    parser = argparse.ArgumentParser(description="Evaluate MolForge prediction models.")
    parser.add_argument("--project-root", type=Path, default=Path("."))
    args = parser.parse_args()
    print(json.dumps(evaluate_samples(args.project_root.resolve()), indent=2))


if __name__ == "__main__":
    main()
