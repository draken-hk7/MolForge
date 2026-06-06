"""GFN2-xTB calculation runner for local and SSH cloud providers."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import time
from typing import Any

from core.molecule_parser import MoleculeParser

try:
    import paramiko
except Exception:  # pragma: no cover - optional remote compute dependency
    paramiko = None


HARTREE_TO_EV = 27.211386245988
HARTREE_TO_KCAL = 627.509474
AU_DIPOLE_TO_DEBYE = 2.541746
RT_LN_10_KCAL_298 = 1.364


class NoComputeAvailable(RuntimeError):
    """Raised when no configured xTB execution provider is available."""


class XTBRunner:
    """Generate molecular geometry, execute xTB, and convert its native output."""

    def __init__(self, executable: str = "xtb", parser: MoleculeParser | None = None) -> None:
        self.executable = executable
        self.parser = parser or MoleculeParser()
        self.oracle_host = os.getenv("ORACLE_HOST", "").strip()
        self.oracle_user = os.getenv("ORACLE_USER", "ubuntu").strip()
        self.oracle_key = os.getenv("ORACLE_SSH_KEY_PATH", "").strip()
        self.gcp_host = os.getenv("GCP_INSTANCE_IP", "").strip()
        self.gcp_user = os.getenv("GCP_USER", "ubuntu").strip()
        self.gcp_key = os.getenv("GCP_SSH_KEY_PATH", os.getenv("ORACLE_SSH_KEY_PATH", "")).strip()
        self.gcp_project = os.getenv("GCP_PROJECT_ID", "").strip()

    def _check_local_xtb(self) -> bool:
        return shutil.which(self.executable) is not None

    def is_available(self) -> bool:
        return bool(self._check_local_xtb() or self._remote_available(self.oracle_host, self.oracle_key) or self._remote_available(self.gcp_host, self.gcp_key))

    def install_xtb_instructions(self) -> str:
        return "No xTB compute provider is available. Configure Oracle/GCP SSH or install xTB in PATH."

    def get_provider_status(self) -> dict[str, Any]:
        local_available = self._check_local_xtb()
        return {
            "oracle": {
                "available": self._remote_available(self.oracle_host, self.oracle_key),
                "host_set": bool(self.oracle_host),
                "xtb_version": None,
            },
            "gcp": {
                "available": self._remote_available(self.gcp_host, self.gcp_key),
                "project_set": bool(self.gcp_project),
                "host_set": bool(self.gcp_host),
                "xtb_version": None,
            },
            "local": {
                "available": local_available,
                "xtb_version": self._local_version() if local_available else None,
            },
            "any_available": bool(local_available or self._remote_available(self.oracle_host, self.oracle_key) or self._remote_available(self.gcp_host, self.gcp_key)),
        }

    def run_calculation(self, smiles: str, job_id: str, properties: list[str] | None = None) -> dict[str, Any]:
        """Run gas and aqueous-solvent single points, then return native and derived values."""
        del properties  # Phase D always calculates the inexpensive native property bundle.
        if not self.is_available():
            raise NoComputeAvailable(self.install_xtb_instructions())
        started = time.perf_counter()
        safe_job_id = re.sub(r"[^A-Za-z0-9_-]", "", job_id)[:80] or "job"
        with tempfile.TemporaryDirectory(prefix=f"molforge-{safe_job_id}-") as directory:
            workdir = Path(directory)
            xyz_path = self.smiles_to_xyz(smiles, workdir)
            if self._remote_available(self.oracle_host, self.oracle_key):
                provider = "oracle"
                self._run_remote(xyz_path, workdir, safe_job_id, self.oracle_host, self.oracle_user, self.oracle_key)
            elif self._remote_available(self.gcp_host, self.gcp_key):
                provider = "gcp"
                self._run_remote(xyz_path, workdir, safe_job_id, self.gcp_host, self.gcp_user, self.gcp_key)
            elif self._check_local_xtb():
                provider = "local"
                self._run_local(xyz_path, workdir)
            else:  # pragma: no cover - guarded by is_available, protects provider races
                raise NoComputeAvailable(self.install_xtb_instructions())
            raw = self._parse_xtb_output(workdir)
        raw["calculation_time_s"] = round(time.perf_counter() - started, 3)
        return {
            "provider": provider,
            "method": "GFN2-xTB with ALPB water",
            "raw": raw,
            "properties": self._convert_to_properties(raw, smiles),
        }

    def smiles_to_xyz(self, smiles: str, output_dir: str | Path) -> Path:
        """Create a valid XYZ geometry, using RDKit through MoleculeParser when available."""
        parsed = self.parser.parse_smiles(smiles)
        molblock = parsed.get("molblock", "")
        if not molblock:
            raise ValueError("Could not generate molecular coordinates for xTB.")
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        xyz_path = output_path / "molecule.xyz"
        xyz_path.write_text(self._molblock_to_xyz(molblock), encoding="utf-8")
        return xyz_path

    def _run_local(self, xyz_path: Path, output_dir: Path) -> None:
        self._run_local_command([self.executable, str(xyz_path), "--sp", "--json"], output_dir, "gas")
        self._run_local_command([self.executable, str(xyz_path), "--sp", "--json", "--alpb", "water"], output_dir, "solvent")

    def _run_local_command(self, command: list[str], output_dir: Path, label: str) -> None:
        process = subprocess.run(command, cwd=output_dir, capture_output=True, text=True, timeout=600, check=False)
        (output_dir / f"{label}.log").write_text(process.stdout + "\n" + process.stderr, encoding="utf-8")
        if process.returncode != 0:
            raise RuntimeError(process.stderr.strip() or process.stdout.strip() or f"xTB {label} calculation failed.")
        output = output_dir / "xtbout.json"
        if not output.exists():
            raise RuntimeError(f"xTB {label} calculation did not produce xtbout.json.")
        output.replace(output_dir / f"{label}.json")

    def _run_remote(self, xyz_path: Path, output_dir: Path, job_id: str, host: str, user: str, key_path: str) -> None:
        if paramiko is None:
            raise NoComputeAvailable("Paramiko is required for SSH cloud compute.")
        remote_dir = f"/home/{user}/molforge_jobs/job_{job_id}"
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            client.connect(host, username=user, key_filename=key_path, timeout=20)
            self._exec_remote(client, f"mkdir -p {shlex.quote(remote_dir)}")
            with client.open_sftp() as sftp:
                sftp.put(str(xyz_path), f"{remote_dir}/molecule.xyz")
            command = (
                f"cd {shlex.quote(remote_dir)} && "
                "xtb molecule.xyz --sp --json > gas.log 2>&1 && mv xtbout.json gas.json && "
                "xtb molecule.xyz --sp --json --alpb water > solvent.log 2>&1 && mv xtbout.json solvent.json"
            )
            self._exec_remote(client, command, timeout=1200)
            with client.open_sftp() as sftp:
                for name in ("gas.json", "solvent.json", "gas.log", "solvent.log"):
                    sftp.get(f"{remote_dir}/{name}", str(output_dir / name))
        finally:
            try:
                self._exec_remote(client, f"rm -rf {shlex.quote(remote_dir)}")
            except Exception:
                pass
            client.close()

    @staticmethod
    def _exec_remote(client: Any, command: str, timeout: int = 60) -> str:
        _, stdout, stderr = client.exec_command(command, timeout=timeout)
        error = stderr.read().decode().strip()
        output = stdout.read().decode()
        status = stdout.channel.recv_exit_status()
        if status != 0:
            raise RuntimeError(error or output.strip() or "Remote xTB command failed.")
        return output

    def _parse_xtb_output(self, output_dir: str | Path) -> dict[str, Any]:
        path = Path(output_dir)
        gas = json.loads((path / "gas.json").read_text(encoding="utf-8"))
        solvent_path = path / "solvent.json"
        solvent = json.loads(solvent_path.read_text(encoding="utf-8")) if solvent_path.exists() else {}
        gap = self._number(gas, "HOMO-LUMO gap/eV", "HOMO-LUMO gap / eV", "HOMO-LUMO gap")
        gas_energy_hartree = self._number(gas, "total energy", "total energy/Eh", "total energy / Eh")
        solvent_energy_hartree = self._number(solvent, "total energy", "total energy/Eh", "total energy / Eh")
        dipole = self._value(gas, "dipole/au", "dipole / a.u.", "dipole")
        dipole_magnitude = math.sqrt(sum(float(value) ** 2 for value in dipole)) * AU_DIPOLE_TO_DEBYE if isinstance(dipole, list) else None
        polarizability = self._number(gas, "polarizability/au", "molecular polarizability", "polarizability")
        if polarizability is None:
            atomic_polarizabilities = self._value(gas, "atomic polarizabilities", "atomic polarizability")
            if isinstance(atomic_polarizabilities, list):
                polarizability = sum(float(value) for value in atomic_polarizabilities)
        solvation = None
        if gas_energy_hartree is not None and solvent_energy_hartree is not None:
            solvation = (solvent_energy_hartree - gas_energy_hartree) * HARTREE_TO_KCAL
        return {
            "homo_ev": self._number(gas, "HOMO/eV", "HOMO / eV"),
            "lumo_ev": self._number(gas, "LUMO/eV", "LUMO / eV"),
            "homo_lumo_gap_ev": gap,
            "total_energy_ev": gas_energy_hartree * HARTREE_TO_EV if gas_energy_hartree is not None else None,
            "dipole_moment_debye": dipole_magnitude,
            "polarizability_au": polarizability,
            "solvation_energy_kcal": solvation,
            "partial_charges": self._value(gas, "partial charges", "partial_charges") or [],
        }

    def _convert_to_properties(self, xtb_data: dict[str, Any], smiles: str) -> dict[str, Any]:
        """Convert xTB-native quantities to MolForge fields without overstating accuracy."""
        descriptors = self.parser.get_descriptors(smiles)
        gap = self._finite(xtb_data.get("homo_lumo_gap_ev"))
        solvation = self._finite(xtb_data.get("solvation_energy_kcal"))
        polarizability = self._finite(xtb_data.get("polarizability_au"))
        properties: dict[str, Any] = {}
        if gap is not None:
            properties["bandgap_ev"] = {
                "value": round(gap, 4),
                "unit": "eV",
                "source": "cloud_xtb",
                "method": "GFN2-xTB molecular HOMO-LUMO gap",
                "confidence": 0.72,
                "note": "Screening estimate for a molecule; not a periodic-solid experimental band gap.",
            }
            properties["chemical_hardness_ev"] = {
                "value": round(gap / 2.0, 4),
                "unit": "eV",
                "source": "cloud_xtb_derived",
                "method": "Half of the GFN2-xTB HOMO-LUMO gap",
                "confidence": 0.68,
                "note": "Chemical hardness proxy; not mechanical hardness in GPa.",
            }
            conductivity = max(1.0e-12, 1.0e4 * math.exp(-gap / (2.0 * 0.025852)))
            properties["conductivity_sm"] = {
                "value": conductivity,
                "unit": "S/m",
                "source": "cloud_xtb_derived",
                "method": "Thermally activated gap screening proxy at 298 K",
                "confidence": 0.35,
                "note": "Screening estimate only; conductivity requires material morphology and transport data.",
            }
        if solvation is not None:
            properties["solubility_logS"] = {
                "value": self._solvation_to_logs(solvation, float(descriptors["MolWt"])),
                "unit": "logS",
                "source": "cloud_xtb_derived",
                "method": "ALPB hydration free-energy screening model",
                "confidence": 0.45,
                "note": "Screening estimate; omits crystal lattice energy, pH, ionization, and temperature effects.",
            }
        if polarizability is not None:
            atom_count = max(1.0, float(descriptors["NumAtoms"]))
            refractive_proxy = max(1.0, min(4.0, 1.0 + 0.04 * polarizability / atom_count))
            properties["refractive_index"] = {
                "value": round(refractive_proxy, 4),
                "unit": "nD",
                "source": "cloud_xtb_derived",
                "method": "Polarizability-per-atom screening proxy",
                "confidence": 0.4,
                "note": "Screening estimate; a physical refractive index also requires bulk density and wavelength.",
            }
        return properties

    @staticmethod
    def _solvation_to_logs(solvation_energy_kcal: float, molecular_weight: float) -> float:
        hydration_component = -solvation_energy_kcal / RT_LN_10_KCAL_298
        size_penalty = max(0.0, molecular_weight - 40.0) * 0.01
        return round(max(-12.0, min(2.0, hydration_component - size_penalty)), 4)

    @staticmethod
    def _remote_available(host: str, key_path: str) -> bool:
        return bool(paramiko and host and key_path and Path(key_path).expanduser().exists())

    def _local_version(self) -> str | None:
        try:
            result = subprocess.run([self.executable, "--version"], capture_output=True, text=True, timeout=5, check=False)
            return (result.stdout or result.stderr).strip().splitlines()[0] or None
        except Exception:
            return None

    @staticmethod
    def _molblock_to_xyz(molblock: str) -> str:
        lines = molblock.splitlines()
        if len(lines) < 4:
            raise ValueError("Invalid MOL block: atom count line is missing.")
        count = int(lines[3][:3])
        atoms = []
        for line in lines[4 : 4 + count]:
            atoms.append(f"{line[31:34].strip()} {line[0:10].strip()} {line[10:20].strip()} {line[20:30].strip()}")
        return f"{count}\nMolForge xTB input\n" + "\n".join(atoms) + "\n"

    @classmethod
    def _value(cls, payload: dict[str, Any], *names: str) -> Any:
        normalized = {cls._normalize_key(key): value for key, value in payload.items()}
        for name in names:
            key = cls._normalize_key(name)
            if key in normalized:
                return normalized[key]
        return None

    @classmethod
    def _number(cls, payload: dict[str, Any], *names: str) -> float | None:
        return cls._finite(cls._value(payload, *names))

    @staticmethod
    def _normalize_key(key: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", str(key).lower())

    @staticmethod
    def _finite(value: Any) -> float | None:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return None
        return numeric if math.isfinite(numeric) else None
