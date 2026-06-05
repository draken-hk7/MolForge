"""Download or materialize a local QM9-style dataset for MolForge."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_sample_rows(project_root: Path) -> list[dict[str, object]]:
    """Load curated sample molecules as a lightweight fallback dataset.

    Args:
        project_root: Repository root path.

    Returns:
        Sample molecule records.
    """
    sample_path = project_root / "backend" / "data" / "sample_molecules.json"
    return json.loads(sample_path.read_text(encoding="utf-8"))


def download_qm9(output_dir: Path) -> dict[str, object]:
    """Download QM9 through DeepChem when available.

    Args:
        output_dir: Directory where metadata should be written.

    Returns:
        Dataset metadata.
    """
    try:
        import deepchem as dc

        tasks, datasets, transformers = dc.molnet.load_qm9(featurizer="GraphConv", reload=True, data_dir=str(output_dir))
        split_sizes = [len(dataset) for dataset in datasets]
        return {
          "source": "deepchem-qm9",
          "tasks": list(tasks),
          "split_sizes": split_sizes,
          "transformers": [type(transformer).__name__ for transformer in transformers]
        }
    except Exception as exc:
        return {"source": "curated-fallback", "reason": str(exc), "tasks": ["bandgap_ev", "melting_point_k", "solubility_logS"]}


def main() -> None:
    """Run the dataset download command.

    Args:
        None.

    Returns:
        None.
    """
    parser = argparse.ArgumentParser(description="Download QM9 or create MolForge fallback dataset metadata.")
    parser.add_argument("--output-dir", type=Path, default=Path("ml/datasets/qm9"))
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[2]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    metadata = download_qm9(args.output_dir)
    if metadata["source"] == "curated-fallback":
        rows = load_sample_rows(project_root)
        (args.output_dir / "sample_molecules.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    (args.output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
