"""FastAPI application entry point for MolForge."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from api.middleware.cors import configure_cors
from api.middleware.error_handler import global_exception_handler
from api.routes import inverse_design, molecules, properties, simulation
from core.inverse_design_engine import InverseDesignEngine
from core.molecular_dynamics import MolecularDynamicsRunner
from core.molecule_parser import MoleculeParser
from core.property_predictor import PropertyPredictor
from core.structure_optimizer import StructureOptimizer


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
    yield


app = FastAPI(
    title="MolForge API",
    description="Molecular material design, property prediction, and inverse design API.",
    version="1.0.0",
    lifespan=lifespan,
)

configure_cors(app)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(molecules.router)
app.include_router(properties.router)
app.include_router(simulation.router)
app.include_router(inverse_design.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Return service health metadata.

    Args:
        None.

    Returns:
        A health payload with status and API version.
    """
    return {"status": "ok", "version": "1.0.0"}
