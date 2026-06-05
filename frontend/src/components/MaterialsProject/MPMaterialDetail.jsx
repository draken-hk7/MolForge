import { Copy, ExternalLink, FlaskConical, X } from 'lucide-react';

import { formatCrystalSystem, formatMPProperty, formatSpacegroup, getMPQualityBadge } from '../../utils/mpDataFormatters';

const sections = {
  Electronic: ['band_gap', 'e_total', 'n', 'ordering', 'total_magnetization'],
  Mechanical: ['bulk_modulus', 'shear_modulus', 'universal_anisotropy', 'homogeneous_poisson'],
  Thermodynamic: ['formation_energy_per_atom', 'energy_above_hull', 'is_stable', 'theoretical'],
  Structural: ['density', 'volume', 'nsites', 'crystal_system']
};

/**
 * Render full detail for one Materials Project material.
 * @param {{material: object, onClose?: Function, onLoad?: Function}} props Component props.
 * @returns {JSX.Element | null} Material detail panel.
 */
export default function MPMaterialDetail({ material, onClose, onLoad }) {
  if (!material) {
    return null;
  }
  const badge = getMPQualityBadge(material);

  const copyCitation = () => {
    const citation = `Materials Project, ${material.material_id}, ${material.formula_pretty}, https://materialsproject.org/materials/${material.material_id}`;
    navigator.clipboard.writeText(citation);
  };

  return (
    <aside className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mono-smiles text-lg font-bold text-white">{material.material_id}</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${badge.color === 'red' ? 'bg-red-500/15 text-red-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{material.formula_pretty}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-black/20 p-3">
          <div className="text-xs text-slate-500">Crystal System</div>
          <div className="text-white">{formatCrystalSystem(material.crystal_system)}</div>
        </div>
        <div className="rounded-lg bg-black/20 p-3">
          <div className="text-xs text-slate-500">Space Group</div>
          <div className="text-white">{formatSpacegroup(material.spacegroup)}</div>
        </div>
      </div>
      <div className="space-y-4">
        {Object.entries(sections).map(([section, keys]) => (
          <div key={section}>
            <h3 className="mb-2 text-sm font-semibold text-white">{section}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {keys.map((key) => (
                <div key={key} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="text-xs text-slate-500">{formatMPProperty(key, material[key]).label}</div>
                  <div className="mono-smiles mt-1 text-sm text-blue-100">{typeof material[key] === 'boolean' ? String(material[key]) : formatMPProperty(key, material[key]).formatted}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={`https://materialsproject.org/materials/${material.material_id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
        >
          <ExternalLink size={15} /> MP Page
        </a>
        <button
          type="button"
          onClick={() => onLoad?.(material)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
        >
          <FlaskConical size={15} /> Load into Editor
        </button>
        <button
          type="button"
          onClick={copyCitation}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
        >
          <Copy size={15} /> Cite
        </button>
      </div>
    </aside>
  );
}
