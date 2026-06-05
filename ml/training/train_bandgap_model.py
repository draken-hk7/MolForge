"""Train a focused band gap model for MolForge."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def train_bandgap_manifest(output_dir: Path) -> dict[str, object]:
    """Create a band gap model manifest.

    Args:
        output_dir: Directory where the manifest should be written.

    Returns:
        Band gap training metadata.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "model": "descriptor-calibrated bandgap regressor",
        "target": "bandgap_ev",
        "features": ["MolWt", "LogP", "TPSA", "AromaticRings", "NumAtoms"],
        "range_ev": [0.0, 10.0],
        "status": "ready-for-local-calibration"
    }
    (output_dir / "bandgap_model_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    """Run band gap model training metadata generation.

    Args:
        None.

    Returns:
        None.
    """
    parser = argparse.ArgumentParser(description="Train the MolForge band gap model.")
    parser.add_argument("--output-dir", type=Path, default=Path("backend/models"))
    args = parser.parse_args()
    print(json.dumps(train_bandgap_manifest(args.output_dir), indent=2))


if __name__ == "__main__":
    main()
