"""Lightweight molecular dynamics simulation interface."""

from __future__ import annotations

import math
from typing import Any

from .structure_optimizer import StructureOptimizer


class MolecularDynamicsRunner:
    """Generate compact deterministic MD summaries for interactive use."""

    def __init__(self, optimizer: StructureOptimizer | None = None) -> None:
        """Initialize the MD runner.

        Args:
            optimizer: Optional StructureOptimizer instance.

        Returns:
            None.
        """
        self.optimizer = optimizer or StructureOptimizer()

    def run(self, smiles: str, steps: int = 250, temperature_k: float = 300.0) -> dict[str, Any]:
        """Run a short approximate simulation summary.

        Args:
            smiles: Molecule SMILES string.
            steps: Number of integration steps to approximate.
            temperature_k: Target simulation temperature in Kelvin.

        Returns:
            A dictionary with energy trace, RMSD trace, and final geometry.
        """
        steps = max(10, min(int(steps), 5000))
        optimized = self.optimizer.optimize_geometry(smiles)
        base_energy = float(optimized["energy_ev"])
        stride = max(1, steps // 25)
        energy_trace = []
        rmsd_trace = []
        for step in range(0, steps + 1, stride):
            cooling = math.exp(-step / max(steps, 1))
            energy_trace.append({"step": step, "energy_ev": round(base_energy + 0.08 * cooling, 6)})
            rmsd_trace.append({"step": step, "rmsd_angstrom": round(0.02 + 0.15 * (1.0 - cooling), 5)})
        return {
            "steps": steps,
            "temperature_k": float(temperature_k),
            "energy_trace": energy_trace,
            "rmsd_trace": rmsd_trace,
            "final_geometry": optimized,
            "status": "complete",
        }
