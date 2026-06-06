"""Local xTB calculation adapter."""

from __future__ import annotations

import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from typing import Any

from core.molecule_parser import MoleculeParser


class XTBRunner:
    """Run xTB when installed; otherwise provide useful setup guidance."""

    def __init__(self, executable: str = "xtb") -> None:
        self.executable = executable

    def is_available(self) -> bool:
        return shutil.which(self.executable) is not None

    def install_xtb_instructions(self) -> str:
        return "Install xTB from https://xtb-docs.readthedocs.io and ensure the xtb executable is in PATH."

    def run_calculation(self, smiles: str) -> dict[str, Any]:
        if not self.is_available():
            raise RuntimeError(self.install_xtb_instructions())
        parser = MoleculeParser()
        parsed = parser.parse_smiles(smiles)
        molblock = parsed.get("molblock", "")
        if not molblock:
            raise ValueError("Could not generate 3D coordinates for xTB.")
        started = time.perf_counter()
        with tempfile.TemporaryDirectory(prefix="molforge-xtb-") as directory:
            path = Path(directory)
            xyz_path = path / "molecule.xyz"
            xyz_path.write_text(self._molblock_to_xyz(molblock), encoding="utf-8")
            process = subprocess.run(
                [self.executable, str(xyz_path), "--opt", "--json"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            if process.returncode != 0:
                raise RuntimeError(process.stderr.strip() or "xTB calculation failed.")
            result_path = path / "xtbout.json"
            raw = json.loads(result_path.read_text(encoding="utf-8")) if result_path.exists() else {}
        orbitals = raw.get("orbital energies/eV", [])
        return {
            "homo_lumo_gap_ev": raw.get("HOMO-LUMO gap/eV"),
            "total_energy_ev": raw.get("total energy/eV"),
            "dipole_moment": raw.get("dipole/au"),
            "partial_charges": raw.get("partial charges", []),
            "optimized_geometry": raw.get("geometry"),
            "calculation_time_s": round(time.perf_counter() - started, 3),
            "orbital_energies_ev": orbitals,
            "method": "xTB",
        }

    @staticmethod
    def _molblock_to_xyz(molblock: str) -> str:
        lines = molblock.splitlines()
        count = int(lines[3][:3])
        atoms = []
        for line in lines[4 : 4 + count]:
            atoms.append(f"{line[31:34].strip()} {line[0:10].strip()} {line[10:20].strip()} {line[20:30].strip()}")
        return f"{count}\nMolForge xTB input\n" + "\n".join(atoms) + "\n"
