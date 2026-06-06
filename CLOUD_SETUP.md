# MolForge Cloud Compute Setup

Phase D routes optional GFN2-xTB calculations to Oracle Always Free, Google Cloud, or a local `xtb` executable. MolForge continues to return immediate local ML estimates when no provider is configured.

## Option 1: Oracle Always Free (Recommended)

1. Create an Oracle Cloud account at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/).
2. Create an Ubuntu 22.04 Ampere A1 instance. Choose an Always Free eligible shape available in your region.
3. Restrict SSH ingress to your IP address and download the private SSH key.
4. Install xTB:

   ```bash
   scp backend/core/cloud_compute/setup_oracle.sh ubuntu@YOUR_IP:~/
   ssh ubuntu@YOUR_IP "bash setup_oracle.sh"
   ```

5. Add the connection to ignored `backend/.env`:

   ```bash
   ORACLE_HOST=YOUR_INSTANCE_IP
   ORACLE_USER=ubuntu
   ORACLE_SSH_KEY_PATH=C:/secure/path/to/oracle-key.pem
   ```

6. Restart FastAPI and call `GET http://127.0.0.1:8000/api/cloud/providers`.

## Option 2: Google Cloud Credits

1. Create a project at [cloud.google.com](https://cloud.google.com/).
2. Enable Compute Engine and create an Ubuntu VM.
3. Restrict SSH ingress to your IP address.
4. Run `backend/core/cloud_compute/setup_oracle.sh` on the VM.
5. Add the connection to ignored `backend/.env`:

   ```bash
   GCP_INSTANCE_IP=YOUR_GCP_IP
   GCP_PROJECT_ID=molforge-compute
   GCP_USER=ubuntu
   GCP_SSH_KEY_PATH=C:/secure/path/to/gcp-key.pem
   ```

6. Restart FastAPI and check `/api/cloud/providers`.

## Option 3: Local xTB

Install xTB from the [official xTB releases](https://github.com/grimme-lab/xtb/releases) or conda-forge, then ensure `xtb --version` works in the shell that starts FastAPI.

## Supabase Cache

Set `SUPABASE_SERVICE_KEY` in ignored `backend/.env` to persist completed calculations in `cloud_jobs`, record training feedback, and update linked cloud molecules. Never expose this service-role key to the frontend.

Precompute the common-molecule cache after a provider and service key are configured:

```bash
python backend/scripts/precompute_common.py
python backend/scripts/precompute_common.py --limit 10
```

## Testing

```bash
curl http://127.0.0.1:8000/api/cloud/providers
curl -X POST http://127.0.0.1:8000/api/cloud/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"smiles\":\"CCO\"}"
```

Poll the returned job ID at `GET /api/cloud/status/{job_id}`.

## Scientific Interpretation

- GFN2-xTB was designed primarily for fast structures, noncovalent interactions, and broad molecular screening. A molecular HOMO-LUMO gap is not a periodic-solid experimental band gap.
- ALPB provides an implicit-solvent energy. Solubility additionally depends on crystal lattice energy, pH, ionization, temperature, and experimental conditions.
- Chemical hardness derived from the HOMO-LUMO gap is not mechanical hardness in GPa.
- Conductivity and refractive-index values shown by MolForge are explicitly labeled screening proxies because transport, density, morphology, and wavelength information are absent.

Primary references:

- [GFN2-xTB method paper](https://doi.org/10.1021/acs.jctc.8b01176)
- [Official xTB properties documentation](https://xtb-docs.readthedocs.io/en/latest/properties.html)
- [Official xTB ALPB documentation](https://xtb-docs.readthedocs.io/en/latest/gbsa.html)

## Cost

Oracle Always Free resources cost `$0/month` while they remain within Oracle's current Always Free eligibility. Google Cloud usage consumes promotional credits and can incur charges after credits expire; configure budgets and alerts before starting a VM.
