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
  const { mpMaterials, searchByFormula, searchByElements, searchByMaterialId, getMaterialDetail, clearError, isLoading, error } = useMaterialsProject();
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
    const detail = await getMaterialDetail(material.material_id).catch(() => {
      clearError();
      return material;
    });
    onSelectMaterial(detail, { skipFetch: true });
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-white">Materials Project Search</h2>
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
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-blue-100 outline-none focus:border-blue-400/60"
            placeholder="SiO2"
          />
        ) : mode === 'elements' ? (
          <input
            value={elementsInput}
            onChange={(event) => setElementsInput(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-blue-100 outline-none focus:border-blue-400/60"
            placeholder="Li,Fe,O"
          />
        ) : (
          <input
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-blue-100 outline-none focus:border-blue-400/60"
            placeholder="mp-3400"
          />
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Search size={16} />}
          Search Materials
        </button>
      </form>
      {error && mpMaterials.length === 0 && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="shrink-0 font-mono text-sm font-semibold text-blue-200" title={material.material_id}>
                    {material.material_id}
                  </span>
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
            <Search className="mb-3 text-indigo-300" size={32} />
            <div className="font-medium text-slate-300">No MP results loaded</div>
            <p className="mt-1 text-sm text-slate-400">Search by formula, elements, or a Materials Project ID.</p>
          </div>
        )}
      </div>
    </section>
  );
}
