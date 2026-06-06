# MolForge

MolForge is a collaborative molecular material designer for interactive SMILES parsing, 3D visualization, atom and functional group edits, local and cloud-assisted property prediction, inverse design, and shared research workflows.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, Zustand, Recharts, React Router, Axios, 3Dmol.js
- Backend: Python 3.11, FastAPI, Pydantic v2, Supabase, Materials Project API, optional RDKit, xTB, Oracle, GCP, DeepChem, ASE, and scikit-optimize
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

## Phase B: Protein Folding

Phase B adds ESMFold protein structure prediction and NGL 3D visualization.

New capabilities:

- `/protein` page for sequence input and 3D viewing
- ESMFold via Hugging Face API (`HF_API_KEY` in `.env`)
- UniProt search and RCSB experimental structures
- Protein property analysis via BioPython
- PubChem ligand search
- Protein comparison side by side
- PDB export

Add `HF_API_KEY=hf_your_token` to `backend/.env`.
Get a free token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

## Phase C: Collaboration, Feedback, and Cloud Accuracy

Phase C adds optional Supabase-backed accounts and research collaboration while preserving MolForge's login-free local workflow.

- Supabase Auth: email/password, magic link, Google OAuth, and GitHub OAuth
- Cloud molecule library, public share links, QR codes, forks, comments, and workspaces
- Public `/explore` gallery with search and popularity sorting
- Private prediction ratings and value corrections for Native AI training
- Automatic Materials Project reconciliation feedback
- Optional local xTB, Oracle Always Free, GCP, Colab, and Kaggle compute paths
- Sentry error monitoring and Mixpanel event tracking when configured

The live Supabase schema is reproducible from `supabase/migrations/20260606150000_phase_c_collaboration.sql`. All public tables have Row Level Security. Frontend code uses only a publishable/anon key. Never expose `SUPABASE_SERVICE_KEY` to the frontend.

### Phase C Environment

Add these values to ignored `.env` files:

```bash
# backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_legacy_anon_jwt_key
SUPABASE_SERVICE_KEY=your_service_role_key
SENTRY_DSN=
MIXPANEL_TOKEN=
ORACLE_HOST=
ORACLE_USER=ubuntu
ORACLE_SSH_KEY_PATH=
GCP_PROJECT_ID=
GCP_CREDENTIALS_PATH=

# frontend/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
VITE_SENTRY_DSN=
VITE_MIXPANEL_TOKEN=
```

The frontend uses RLS-safe direct Supabase fallbacks for user-owned operations when the backend service role is not configured. Add the service-role key to enable privileged backend operations, automatic counters, and durable cloud-job caching.

### Free Compute Setup

Oracle Always Free:

1. Create an Ampere A1 Ubuntu instance and add your SSH public key.
2. Install xTB on the instance and verify `xtb --version`.
3. Set `ORACLE_HOST`, `ORACLE_USER`, and `ORACLE_SSH_KEY_PATH` in `backend/.env`.

Google Cloud:

1. Create a GCP project and enable Compute Engine using the free-trial credits.
2. Create a least-privilege service account and download its JSON credentials.
3. Set `GCP_PROJECT_ID` and `GCP_CREDENTIALS_PATH` in `backend/.env`.

The generated Colab training notebook is at `ml/training/MolForge_Native_AI_Training.ipynb`. Provide `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` as private Colab secrets before running it.

## End-to-End Workflow

1. Open the editor.
2. Enter a SMILES string such as `CCO`, or load a curated sample.
3. Parse the molecule to render atoms, bonds, descriptors, and a MOL block.
4. Predict material properties.
5. Modify the molecule with atom swaps or functional group additions.
6. Compare original and modified predictions on the Results page.
7. Save or export the design as JSON, SDF, or PDF.
8. Sign in to sync the molecule, share it, fork community designs, submit feedback, or run optional cloud calculations.

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
supabase/  Reproducible Phase C database migration and RLS policies
docker/    Dockerfiles and nginx configuration
```
