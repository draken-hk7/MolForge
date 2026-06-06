"""Generate a portable Colab notebook for feedback-driven model training."""

from __future__ import annotations

import json
from pathlib import Path


def generate_colab_notebook(output_path: str | Path) -> Path:
    """Write a complete Colab starter notebook for Native AI training."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cells = [
        {"cell_type": "markdown", "metadata": {}, "source": ["# MolForge Native AI Training\n", "Downloads admin-only feedback, trains a baseline regressor, and exports weights."]},
        {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["!pip -q install supabase pandas scikit-learn joblib\n"]},
        {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
            "import os, joblib, pandas as pd\n",
            "from supabase import create_client\n",
            "from sklearn.ensemble import RandomForestRegressor\n",
            "url = os.environ['SUPABASE_URL']\n",
            "key = os.environ['SUPABASE_SERVICE_KEY']\n",
            "rows = create_client(url, key).table('predictions_feedback').select('*').execute().data\n",
            "df = pd.DataFrame(rows).dropna(subset=['predicted_value'])\n",
            "df['target'] = df['cloud_calculated_value'].fillna(df['mp_actual_value']).fillna(df['corrected_value'])\n",
            "train = df.dropna(subset=['target'])\n",
            "model = RandomForestRegressor(n_estimators=250, random_state=1337).fit(train[['predicted_value']], train['target'])\n",
            "joblib.dump(model, 'molforge_feedback_calibrator.joblib')\n",
            "print(f'Trained on {len(train)} feedback rows')\n"
        ]},
    ]
    notebook = {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "colab": {"name": "MolForge_Native_AI_Training.ipynb"}}, "nbformat": 4, "nbformat_minor": 5}
    path.write_text(json.dumps(notebook, indent=2), encoding="utf-8")
    return path
