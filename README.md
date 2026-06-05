# MolForge

MolForge is a molecular material designer for interactive SMILES parsing, 3D visualization, atom and functional group edits, local property prediction, inverse design, and original-versus-modified comparison.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, Zustand, Recharts, React Router, Axios, 3Dmol.js
- Backend: Python 3.11, FastAPI, Pydantic v2, Materials Project API, optional RDKit, optional DeepChem on compatible Python versions, optional ASE, optional scikit-optimize
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

## Phase A: Materials Project Integration

MolForge can enrich local ML predictions with real Materials Project data from `https://api.materialsproject.org`. The backend reads an API key from `MP_API_KEY` or from the in-app Settings page for the current server session.

Get a free key from [materialsproject.org](https://materialsproject.org), then set:

```bash
set MP_API_KEY=mpapikey_your_key_here
```

or add it to `backend/.env`. Never commit a real key; `.env` files are ignored.

New capabilities:

- `/materials` Materials Project database browser with formula and element search
- `/settings` API key validation, prediction preferences, and cache stats
- `/api/mp/status`, `/api/mp/search-formula`, `/api/mp/search-elements`, `/api/mp/material/{material_id}`
- `/api/properties/predict?mp=true` returns local ML predictions plus `mp_data` when available

Fallback behavior:

- If `MP_API_KEY` is not set, predictions stay local ML only.
- If MP is unreachable, rate limited, or returns no formula match, the UI keeps the ML prediction path.
- MP requests use a 5 second timeout and an in-memory TTL cache to avoid repeated queries.

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

MolForge works without external model artifacts. If DeepChem is installed and model artifacts are present in `backend/models/graphconv_qm9/`, the backend attempts to restore them at startup. Otherwise it uses deterministic descriptor-based fallbacks with units and confidence scores. CI uses Python 3.11, where DeepChem 2.7.1 is skipped because no compatible wheel is published.

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
