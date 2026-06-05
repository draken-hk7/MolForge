# MolForge Model Artifacts

MolForge runs without external model files by using deterministic RDKit descriptor fallbacks. For learned predictions, place a restored DeepChem GraphConv model in:

```text
backend/models/graphconv_qm9/
```

The backend checks this path at startup and falls back automatically when a compatible model is not present.
