"""Train or calibrate the general MolForge property model."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def build_training_manifest(output_dir: Path) -> dict[str, object]:
    """Build a training manifest and optional DeepChem model artifact.

    Args:
        output_dir: Directory where the model manifest should be stored.

    Returns:
        A training manifest describing the generated artifact.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        import deepchem as dc

        tasks, datasets, _transformers = dc.molnet.load_qm9(featurizer="GraphConv", reload=True)
        model = dc.models.GraphConvModel(n_tasks=len(tasks), mode="regression", model_dir=str(output_dir / "graphconv_qm9"))
        manifest = {
            "model": "DeepChem GraphConvModel",
            "tasks": list(tasks),
            "split_sizes": [len(dataset) for dataset in datasets],
            "artifact_dir": str(output_dir / "graphconv_qm9"),
            "status": "initialized"
        }
    except Exception as exc:
        manifest = {
            "model": "deterministic descriptor fallback",
            "tasks": ["bandgap_ev", "melting_point_k", "solubility_logS", "hardness_gpa", "conductivity_sm", "refractive_index"],
            "artifact_dir": str(output_dir),
            "status": "fallback",
            "reason": str(exc)
        }
    (output_dir / "property_model_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    """Run property model training or fallback calibration.

    Args:
        None.

    Returns:
        None.
    """
    parser = argparse.ArgumentParser(description="Train the MolForge property model.")
    parser.add_argument("--output-dir", type=Path, default=Path("backend/models"))
    args = parser.parse_args()
    manifest = build_training_manifest(args.output_dir)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
