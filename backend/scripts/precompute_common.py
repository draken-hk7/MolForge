"""Precompute and persist Phase D xTB results for common molecules."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys
import time


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_env_file(BACKEND_ROOT / ".env")

from core.cloud_compute.job_manager import CloudJobManager  # noqa: E402


MOLECULES_TO_PRECOMPUTE = [
    ("water", "O"),
    ("ethanol", "CCO"),
    ("benzene", "c1ccccc1"),
    ("acetic acid", "CC(=O)O"),
    ("caffeine", "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"),
    ("aspirin", "CC(=O)Oc1ccccc1C(=O)O"),
    ("methane", "C"),
    ("carbon dioxide", "O=C=O"),
    ("ammonia", "N"),
    ("ethane", "CC"),
    ("propane", "CCC"),
    ("butane", "CCCC"),
    ("pentane", "CCCCC"),
    ("hexane", "CCCCCC"),
    ("methanol", "CO"),
    ("1-propanol", "CCCO"),
    ("2-propanol", "CC(O)C"),
    ("acetone", "CC(=O)C"),
    ("formaldehyde", "C=O"),
    ("acetaldehyde", "CC=O"),
    ("formic acid", "O=CO"),
    ("propionic acid", "CCC(=O)O"),
    ("butyric acid", "CCCC(=O)O"),
    ("ethyl acetate", "CCOC(=O)C"),
    ("dimethyl ether", "COC"),
    ("diethyl ether", "CCOCC"),
    ("ethylene", "C=C"),
    ("propylene", "CC=C"),
    ("acetylene", "C#C"),
    ("cyclohexane", "C1CCCCC1"),
    ("cyclopentane", "C1CCCC1"),
    ("toluene", "Cc1ccccc1"),
    ("ethylbenzene", "CCc1ccccc1"),
    ("phenol", "Oc1ccccc1"),
    ("aniline", "Nc1ccccc1"),
    ("benzoic acid", "O=C(O)c1ccccc1"),
    ("nitrobenzene", "[O-][N+](=O)c1ccccc1"),
    ("chlorobenzene", "Clc1ccccc1"),
    ("fluorobenzene", "Fc1ccccc1"),
    ("bromobenzene", "Brc1ccccc1"),
    ("pyridine", "n1ccccc1"),
    ("pyrrole", "c1cc[nH]c1"),
    ("furan", "c1ccoc1"),
    ("thiophene", "c1ccsc1"),
    ("naphthalene", "c1ccc2ccccc2c1"),
    ("glucose", "OCC1OC(O)C(O)C(O)C1O"),
    ("fructose", "OCC(O)C(O)C(O)C(=O)CO"),
    ("glycine", "NCC(=O)O"),
    ("alanine", "CC(N)C(=O)O"),
    ("valine", "CC(C)C(N)C(=O)O"),
    ("leucine", "CC(C)CC(N)C(=O)O"),
    ("serine", "NC(CO)C(=O)O"),
    ("cysteine", "NC(CS)C(=O)O"),
    ("lysine", "NCCCC[C@H](N)C(=O)O"),
    ("glutamic acid", "NC(CCC(=O)O)C(=O)O"),
    ("urea", "NC(=O)N"),
    ("thiourea", "NC(=S)N"),
    ("hydrogen peroxide", "OO"),
    ("nitric acid", "O[N+](=O)[O-]"),
    ("sulfuric acid", "OS(=O)(=O)O"),
    ("phosphoric acid", "OP(=O)(O)O"),
    ("sodium chloride", "[Na+].[Cl-]"),
    ("potassium chloride", "[K+].[Cl-]"),
    ("magnesium oxide", "[Mg].[O]"),
    ("calcium oxide", "[Ca].[O]"),
    ("silicon", "[Si]"),
    ("iron", "[Fe]"),
    ("copper", "[Cu]"),
    ("gold", "[Au]"),
    ("aluminum", "[Al]"),
    ("titanium", "[Ti]"),
    ("zinc", "[Zn]"),
    ("sodium", "[Na]"),
    ("potassium", "[K]"),
    ("calcium", "[Ca]"),
    ("magnesium", "[Mg]"),
    ("hydrogen fluoride", "F"),
    ("hydrogen chloride", "Cl"),
    ("hydrogen bromide", "Br"),
    ("hydrazine", "NN"),
    ("hydroxylamine", "NO"),
    ("acetonitrile", "CC#N"),
    ("acrylonitrile", "C=CC#N"),
    ("dimethylformamide", "CN(C)C=O"),
    ("dimethyl sulfoxide", "CS(=O)C"),
    ("chloroform", "ClC(Cl)Cl"),
    ("dichloromethane", "ClCCl"),
    ("carbon tetrachloride", "ClC(Cl)(Cl)Cl"),
    ("ethylene glycol", "OCCO"),
    ("glycerol", "OCC(O)CO"),
    ("ethylenediamine", "NCCN"),
    ("triethylamine", "CCN(CC)CC"),
    ("methylamine", "CN"),
    ("dimethylamine", "CNC"),
    ("trimethylamine", "CN(C)C"),
    ("ibuprofen", "CC(C)Cc1ccc(cc1)C(C)C(=O)O"),
    ("paracetamol", "CC(=O)Nc1ccc(O)cc1"),
    ("salicylic acid", "O=C(O)c1ccccc1O"),
    ("nicotine", "CN1CCC[C@H]1c2cccnc2"),
    ("uracil", "O=C1NC=CC(=O)N1"),
]

assert len(MOLECULES_TO_PRECOMPUTE) == 100


def wait_for_job(manager: CloudJobManager, job_id: str, timeout: int) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        status = manager.get_job_status(job_id)
        if status["status"] in {"completed", "failed"}:
            return status
        time.sleep(2)
    raise TimeoutError(f"Cloud job {job_id} did not finish within {timeout} seconds.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=100, help="Maximum molecules to process.")
    parser.add_argument("--timeout", type=int, default=1200, help="Per-molecule timeout in seconds.")
    args = parser.parse_args()

    manager = CloudJobManager()
    if not manager.gateway.service_available:
        print("SUPABASE_SERVICE_KEY is required so completed results persist in cloud_jobs.", file=sys.stderr)
        return 2
    if not manager.get_provider_status()["any_available"]:
        print("No Oracle, GCP, or local xTB provider is available.", file=sys.stderr)
        return 2

    failures = 0
    selected = MOLECULES_TO_PRECOMPUTE[: max(0, min(args.limit, len(MOLECULES_TO_PRECOMPUTE)))]
    for index, (name, smiles) in enumerate(selected, start=1):
        try:
            submitted = manager.submit_job(smiles, tier="admin", priority=True)
            status = submitted if submitted.get("cached") else wait_for_job(manager, submitted["job_id"], args.timeout)
            print(f"[{index:03}/{len(selected):03}] {name}: {status['status']}{' (cached)' if submitted.get('cached') else ''}")
            if status["status"] != "completed":
                failures += 1
        except Exception as exc:
            failures += 1
            print(f"[{index:03}/{len(selected):03}] {name}: failed - {exc}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
