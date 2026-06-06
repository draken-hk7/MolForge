import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';

import { useMaterialsProject } from '../../hooks/useMaterialsProject';
import { cn } from '../../utils/classNames';
import { formatCrystalSystem, formatMPProperty, getMPQualityBadge } from '../../utils/mpDataFormatters';

const searchModes = [
  { key: 'formula', label: 'Formula' },
  { key: 'elements', label: 'Elements' },
  { key: 'materialId', label: 'Material ID' }
];

/**
 * Render Materials Project formula, element, and material-id search.
 * @param {{initialFormula?: string, onSelectMaterial?: Function}} props Component props.
 * @returns {JSX.Element} Search panel.
 */
export default function MPSearchPanel({ initialFormula = 'SiO2', onSelectMaterial = () => {} }) {
  const { mpMaterials, searchByFormula, searchByElements, searchByMaterialId, getMaterialDetail, isLoading, error } = useMaterialsProject();
  const [formula, setFormula] = useState(initialFormula);
  const [elementsInput, setElementsInput] = useState('Si,O');
  const [materialId, setMaterialId] = useState('mp-3400');
  const [mode, setMode] = useState('formula');

  const handleSearch = async (event) => {
    event.preventDefault();
    if (mode === 'formula') {
      await searchByFormula(formula);
      return;
    }
    if (mode === 'materialId') {
      const material = await searchByMaterialId(materialId.trim());
      if (material) {
        onSelectMaterial(material, { skipFetch: true });
      }
      return;
    }
    const elements = elementsInput
      .split(',')
      .map((element) => element.trim())
      .filter(Boolean);
    await searchByElements(elements);
  };

  const handleSelect = async (material) => {
    const detail = await getMaterialDetail(material.material_id).catch(() => material);
    onSelectMaterial(detail, { skipFetch: true });
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Materials Project Search</h2>
        <p className="text-xs text-slate-400">Search real materials by formula, element system, or MP id</p>
      </div>
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
          {searchModes.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              className={cn('flex-1 rounded-md px-2 py-1.5 text-xs font-semibold', mode === item.key ? 'bg-blue-500 text-white' : 'text-slate-400')}
            >
              {item.label}
            </button>
          ))}
        </div>
        {mode === 'formula' ? (
          <input
            value={formula}
            onChange={(event) => setFormula(event.target.value)}
            className="mono-smiles w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-blue-100 outline-none focus:border-blue-400/60"
            placeholder="SiO2"
          />
        ) : mode === 'elements' ? (
          <input
            value={elementsInput}
            onChange={(event) => setElementsInput(event.target.value)}
            className="mono-smiles w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-blue-100 outline-none focus:border-blue-400/60"
            placeholder="Li,Fe,O"
          />
        ) : (
          <input
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
            className="mono-smiles w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-blue-100 outline-none focus:border-blue-400/60"
            placeholder="mp-3400"
          />
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search Materials
        </button>
      </form>
      {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="mt-5 space-y-3">
        {isLoading && mpMaterials.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />)
        ) : mpMaterials.length > 0 ? (
          mpMaterials.map((material) => {
            const badge = getMPQualityBadge(material);
            return (
              <button
                key={material.material_id}
                type="button"
                onClick={() => handleSelect(material)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-blue-400/40 hover:bg-blue-500/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="mono-smiles text-sm font-semibold text-blue-200">{material.material_id}</span>
                  <span className={cn('rounded-md px-2 py-1 text-xs', badge.color === 'emerald' && 'bg-emerald-500/15 text-emerald-200', badge.color === 'red' && 'bg-red-500/15 text-red-200', badge.color === 'blue' && 'bg-blue-500/15 text-blue-200')}>
                    {badge.label}
                  </span>
                </div>
                <div className="mt-2 text-sm text-white">{material.formula_pretty || 'Unknown formula'}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <span>{formatMPProperty('band_gap', material.band_gap).formatted}</span>
                  <span>{formatCrystalSystem(material.crystal_system)}</span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-slate-400">
            No MP results are loaded. Without an API key, searches fall back to local ML only.
          </div>
        )}
      </div>
    </section>
  );
}
