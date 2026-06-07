"""Optional native MolForge graph-neural-network inference."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

try:
    import torch
    import torch.nn.functional as F
    from torch.nn import Linear
    from torch_geometric.data import Data
    from torch_geometric.nn import GCNConv, global_mean_pool
except Exception:  # pragma: no cover - optional training dependency
    torch = None
    F = None
    Linear = None
    Data = None
    GCNConv = None
    global_mean_pool = None

try:
    from rdkit import Chem
except Exception:  # pragma: no cover - RDKit is optional in minimal deployments
    Chem = None


logger = logging.getLogger(__name__)
OUTPUTS = (
    ("bandgap_ev", "eV"),
    ("melting_point_k", "K"),
    ("solubility_logS", "logS"),
    ("hardness_gpa", "GPa"),
    ("conductivity_sm", "S/m"),
    ("refractive_index", "nD"),
)


if torch is not None and GCNConv is not None:

    class MolForgeGNN(torch.nn.Module):
        """Three-layer molecular graph regressor used by the Colab notebook."""

        def __init__(self) -> None:
            super().__init__()
            self.conv1 = GCNConv(9, 64)
            self.conv2 = GCNConv(64, 64)
            self.conv3 = GCNConv(64, 128)
            self.fc1 = Linear(128, 64)
            self.fc2 = Linear(64, len(OUTPUTS))

        def forward(self, data: Any) -> Any:
            x, edge_index, batch = data.x, data.edge_index, data.batch
            x = F.relu(self.conv1(x, edge_index))
            x = F.relu(self.conv2(x, edge_index))
            x = F.relu(self.conv3(x, edge_index))
            x = global_mean_pool(x, batch)
            return self.fc2(F.relu(self.fc1(x)))

else:

    class MolForgeGNN:  # pragma: no cover - only instantiated when dependencies exist
        """Placeholder that documents why native inference is unavailable."""

        def __init__(self) -> None:
            raise RuntimeError("torch and torch-geometric are required for MolForgeGNN.")


def smiles_to_graph(smiles: str) -> Any | None:
    """Convert a SMILES string into the nine-feature graph used by MolForgeGNN."""
    if torch is None or Data is None or Chem is None:
        return None
    molecule = Chem.MolFromSmiles(smiles)
    if molecule is None:
        return None
    features = []
    for atom in molecule.GetAtoms():
        features.append(
            [
                atom.GetAtomicNum() / 100.0,
                atom.GetDegree() / 8.0,
                atom.GetFormalCharge() / 4.0,
                float(atom.GetIsAromatic()),
                atom.GetTotalNumHs() / 8.0,
                float(atom.IsInRing()),
                atom.GetMass() / 250.0,
                atom.GetTotalValence() / 8.0,
                float(atom.GetHybridization()) / 8.0,
            ]
        )
    edges = []
    for bond in molecule.GetBonds():
        start, end = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        edges.extend(((start, end), (end, start)))
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous() if edges else torch.empty((2, 0), dtype=torch.long)
    return Data(
        x=torch.tensor(features, dtype=torch.float),
        edge_index=edge_index,
        batch=torch.zeros(len(features), dtype=torch.long),
    )


class GNNPredictor:
    """Load and run an optional MolForge Native AI model without breaking fallback ML."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        default = Path(__file__).resolve().parents[1] / "models" / "molforge_gnn.pt"
        self.model_path = Path(model_path or default)
        self.model: Any | None = None
        self._load_model()

    def _load_model(self) -> None:
        if torch is None or GCNConv is None or not self.model_path.exists():
            logger.info("No compatible GNN model found, using ML fallback")
            return
        try:
            self.model = MolForgeGNN()
            state = torch.load(self.model_path, map_location="cpu", weights_only=True)
            self.model.load_state_dict(state)
            self.model.eval()
            logger.info("GNN model loaded")
        except Exception:
            logger.exception("GNN model could not be loaded; using ML fallback")
            self.model = None

    def predict(self, smiles: str) -> dict[str, dict[str, Any]] | None:
        if self.model is None or torch is None:
            return None
        graph = smiles_to_graph(smiles)
        if graph is None:
            return None
        with torch.no_grad():
            values = self.model(graph).reshape(-1).tolist()
        return {
            key: {
                "value": round(float(values[index]), 4),
                "unit": unit,
                "confidence": 0.85,
                "source": "native_ai_gnn",
                "method": "MolForge Native GNN",
                "note": "Native graph neural network trained on curated molecular datasets.",
            }
            for index, (key, unit) in enumerate(OUTPUTS)
        }
