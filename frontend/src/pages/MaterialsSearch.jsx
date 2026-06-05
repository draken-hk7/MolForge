import { Database, Filter, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MPMaterialDetail from '../components/MaterialsProject/MPMaterialDetail';
import MPSearchPanel from '../components/MaterialsProject/MPSearchPanel';
import MPStatusBadge from '../components/MaterialsProject/MPStatusBadge';
import { useMaterialsProject } from '../hooks/useMaterialsProject';
import { useMoleculeStore } from '../store/moleculeStore';
import { parseMolecule } from '../utils/api';
import { cn } from '../utils/classNames';
import { formatCrystalSystem, formatMPProperty, getMPQualityBadge } from '../utils/mpDataFormatters';

/**
 * Convert a formula to a disconnected atom SMILES approximation.
 * @param {string} formula Formula string.
 * @returns {string} Pseudo-SMILES string.
 */
function formulaToPseudoSmiles(formula) {
  const atoms = [];
  for (const match of String(formula || '').matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const count = Math.min(Number(match[2] || 1), 12);
    for (let index = 0; index < count; index += 1) {
      atoms.push(`[${match[1]}]`);
    }
  }
  return atoms.length > 0 ? atoms.join('.') : 'C';
}

/**
 * Render the Materials Project database browser.
 * @returns {JSX.Element} Materials search page.
 */
export default function MaterialsSearch() {
  const navigate = useNavigate();
  const { mpMaterials, selectedMPMaterial, getMaterialDetail, isLoading } = useMaterialsProject();
  const { setSmiles, setMolecule, setSelectedMPMaterial, setError } = useMoleculeStore();
  const [filters, setFilters] = useState({
    crystalSystem: '',
    stableOnly: false,
    bandGapMax: 10,
    hasElasticity: false,
    hasDielectric: false
  });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return mpMaterials.filter((material) => {
      if (filters.crystalSystem && String(material.crystal_system || '').toLowerCase() !== filters.crystalSystem) {
        return false;
      }
      if (filters.stableOnly && material.is_stable !== true) {
        return false;
      }
      if (Number(material.band_gap || 0) > Number(filters.bandGapMax)) {
        return false;
      }
      if (filters.hasElasticity && !material.bulk_modulus && !material.shear_modulus) {
        return false;
      }
      if (filters.hasDielectric && !material.e_total && !material.n) {
        return false;
      }
      return true;
    });
  }, [filters, mpMaterials]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
  const pageRows = filtered.slice((page - 1) * 20, page * 20);

  const handleSelect = async (material) => {
    setSelectedMPMaterial(material);
    if (material.material_id) {
      await getMaterialDetail(material.material_id).catch(() => material);
    }
  };

  const handleLoad = async (material) => {
    try {
      const smiles = formulaToPseudoSmiles(material.formula_pretty);
      const parsed = await parseMolecule(smiles);
      setSmiles(parsed.smiles);
      setMolecule(parsed);
      navigate('/editor');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Database className="text-blue-300" size={24} /> Materials Project Database
          </h1>
          <p className="mt-1 text-sm text-slate-400">Real DFT-computed materials data with local ML fallback</p>
        </div>
        <MPStatusBadge />
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <MPSearchPanel onSelectMaterial={handleSelect} />
          <section className="glass-panel rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <Filter size={17} className="text-blue-300" />
              <h2 className="text-base font-semibold text-white">Filters</h2>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Crystal system</span>
                <select
                  value={filters.crystalSystem}
                  onChange={(event) => setFilters((value) => ({ ...value, crystalSystem: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#12121a] px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Any</option>
                  {['cubic', 'hexagonal', 'tetragonal', 'orthorhombic', 'trigonal', 'monoclinic', 'triclinic'].map((system) => (
                    <option key={system} value={system}>
                      {system}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>Band gap max</span>
                  <span>{filters.bandGapMax} eV</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={filters.bandGapMax}
                  onChange={(event) => setFilters((value) => ({ ...value, bandGapMax: event.target.value }))}
                  className="w-full accent-blue-500"
                />
              </label>
              {[
                ['stableOnly', 'Stable only'],
                ['hasElasticity', 'Has elasticity data'],
                ['hasDielectric', 'Has dielectric data']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(event) => setFilters((value) => ({ ...value, [key]: event.target.checked }))}
                    className="h-4 w-4 accent-blue-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
        </div>

        <section className="glass-panel rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Results</h2>
              <p className="text-xs text-slate-400">{filtered.length} materials match current filters</p>
            </div>
            {isLoading && <Loader2 size={18} className="animate-spin text-blue-300" />}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {pageRows.map((material) => {
              const badge = getMPQualityBadge(material);
              const active = selectedMPMaterial?.material_id === material.material_id;
              return (
                <button
                  key={material.material_id}
                  type="button"
                  onClick={() => handleSelect(material)}
                  className={cn('rounded-2xl border p-4 text-left transition', active ? 'border-blue-400/60 bg-blue-500/15' : 'border-white/10 bg-white/[0.04] hover:border-blue-400/40 hover:bg-blue-500/10')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono-smiles text-sm font-semibold text-blue-200">{material.material_id}</span>
                    <span className={cn('rounded-md px-2 py-1 text-xs', badge.color === 'red' ? 'bg-red-500/15 text-red-200' : 'bg-emerald-500/15 text-emerald-200')}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{material.formula_pretty}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <span>{formatMPProperty('band_gap', material.band_gap).formatted}</span>
                    <span>{formatCrystalSystem(material.crystal_system)}</span>
                    <span>{formatMPProperty('energy_above_hull', material.energy_above_hull).formatted}</span>
                    <span>{formatMPProperty('density', material.density).formatted}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {pageRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-slate-400">
              No materials match the current query and filters.
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>

        <MPMaterialDetail material={selectedMPMaterial} onLoad={handleLoad} />
      </div>
    </div>
  );
}
