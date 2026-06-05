# MolForge

MolForge is a molecular material designer for interactive SMILES parsing, 3D visualization, atom and functional group edits, local property prediction, inverse design, and original-versus-modified comparison.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, Zustand, Recharts, React Router, Axios, 3Dmol.js
- Backend: Python 3.11, FastAPI, Pydantic v2, optional RDKit, optional DeepChem, optional ASE, optional scikit-optimize
- Deployment: Docker Compose with nginx proxying `/api/*` to FastAPI

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`, with health status at `http://localhost:8000/health`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is available at `http://localhost:5173`.

## End-to-End Workflow

1. Open the editor.
2. Enter a SMILES string such as `CCO`, or load a curated sample.
3. Parse the molecule to render atoms, bonds, descriptors, and a MOL block.
4. Predict material properties.
5. Modify the molecule with atom swaps or functional group additions.
6. Compare original and modified predictions on the Results page.
7. Save or export the design as JSON, SDF, or PDF.

## Docker

```bash
docker compose up --build
```

The frontend is served at `http://localhost`, and the backend is exposed on `http://localhost:8000`.

## Models

MolForge works without external model artifacts. If DeepChem model artifacts are present in `backend/models/graphconv_qm9/`, the backend attempts to restore them at startup. Otherwise it uses deterministic descriptor-based fallbacks with units and confidence scores.

## Tests

```bash
python -m pytest backend/tests -q
cd frontend
npm run lint
npm run build
```

## Project Layout

```text
backend/   FastAPI routes, chemistry core, sample data, tests
frontend/  React application and UI components
ml/        Dataset, training, and evaluation helpers
docker/    Dockerfiles and nginx configuration
```
