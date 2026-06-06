"""FastAPI application entry point for MolForge."""

from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI

from api.middleware.cors import configure_cors
from api.middleware.error_handler import global_exception_handler
from api.middleware.rate_limit import configure_rate_limiting
from api.routes import (
    auth,
    cloud_compute,
    collaboration,
    community,
    feedback,
    inverse_design,
    materials_project,
    molecules,
    properties,
    proteins,
    simulation,
)
from core.cloud_compute.job_manager import CloudJobManager
from core.inverse_design_engine import InverseDesignEngine
from core.materials_project_client import MaterialsProjectClient
from core.molecular_dynamics import MolecularDynamicsRunner
from core.molecule_parser import MoleculeParser
from core.property_reconciler import PropertyReconciler
from core.property_predictor import PropertyPredictor
from core.protein_analyzer import ProteinAnalyzer
from core.protein_predictor import ProteinPredictor
from core.structure_optimizer import StructureOptimizer
from core.supabase_client import get_gateway
from core.telemetry import configure_sentry
from core.uniprot_client import UniProtClient


def _load_env_file(path: Path) -> None:
    """Load simple KEY=VALUE pairs from a local env file without extra runtime deps."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_env_file(Path(__file__).resolve().parents[1] / ".env")
configure_sentry()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load reusable chemistry and ML services into application state.

    Args:
        app: FastAPI application instance.

    Returns:
        An async context manager yielding control while the app is running.
    """
    parser = MoleculeParser()
    predictor = PropertyPredictor(parser=parser)
    optimizer = StructureOptimizer(parser=parser)
    app.state.parser = parser
    app.state.property_predictor = predictor
    app.state.structure_optimizer = optimizer
    app.state.inverse_design_engine = InverseDesignEngine(predictor=predictor, parser=parser)
    app.state.md_runner = MolecularDynamicsRunner(optimizer=optimizer)
    app.state.mp_client = MaterialsProjectClient()
    app.state.property_reconciler = PropertyReconciler()
    app.state.protein_predictor = ProteinPredictor()
    app.state.protein_analyzer = ProteinAnalyzer()
    app.state.uniprot_client = UniProtClient()
    app.state.supabase = get_gateway()
    app.state.cloud_job_manager = CloudJobManager(gateway=app.state.supabase)
    yield


app = FastAPI(
    title="MolForge API",
    description="Molecular material design, property prediction, and inverse design API.",
    version="1.0.0",
    lifespan=lifespan,
)

configure_cors(app)
configure_rate_limiting(app)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(molecules.router)
app.include_router(properties.router)
app.include_router(simulation.router)
app.include_router(inverse_design.router)
app.include_router(materials_project.router)
app.include_router(proteins.router)
app.include_router(auth.router)
app.include_router(collaboration.router)
app.include_router(community.router)
app.include_router(feedback.router)
app.include_router(cloud_compute.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Return service health metadata.

    Args:
        None.

    Returns:
        A health payload with status and API version.
    """
    return {"status": "ok", "version": "1.0.0"}
