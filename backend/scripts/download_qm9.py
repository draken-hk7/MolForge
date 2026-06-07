"""Download the canonical DeepChem QM9 CSV with progress reporting."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import requests

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover - friendly fallback for minimal environments
    tqdm = None


QM9_URL = "https://deepchemdata.s3-us-west-1.amazonaws.com/datasets/qm9.csv"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "ml" / "datasets" / "qm9.csv"


def download_qm9(output: Path = DEFAULT_OUTPUT, force: bool = False) -> Path:
    """Stream QM9 to disk, using a temporary file for crash safety."""
    output = Path(output)
    if output.exists() and output.stat().st_size > 1_000_000 and not force:
        print(f"QM9 already exists at {output}")
        return output
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".part")
    with requests.get(QM9_URL, stream=True, timeout=60) as response:
        response.raise_for_status()
        total = int(response.headers.get("content-length", 0))
        progress = tqdm(total=total, unit="B", unit_scale=True, desc="Downloading QM9") if tqdm else None
        with temporary.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                handle.write(chunk)
                if progress:
                    progress.update(len(chunk))
        if progress:
            progress.close()
    temporary.replace(output)
    print(f"Saved QM9 to {output}")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Destination CSV path.")
    parser.add_argument("--force", action="store_true", help="Download even when the destination already exists.")
    args = parser.parse_args()
    try:
        download_qm9(args.output, args.force)
        return 0
    except Exception as exc:
        print(f"QM9 download failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
