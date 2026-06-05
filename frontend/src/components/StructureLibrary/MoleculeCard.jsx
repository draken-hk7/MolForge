import { ExternalLink, Trash2 } from 'lucide-react';

import { atomSummary } from '../../utils/smilesUtils';

/**
 * Render one saved molecule card.
 * @param {object} props Component props.
 * @returns {JSX.Element} Molecule card.
 */
export default function MoleculeCard({ molecule, onLoad, onRemove }) {
  return (
    <article className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{molecule.name}</h3>
          <p className="mono-smiles mt-1 truncate text-xs text-indigo-200">{molecule.smiles}</p>
        </div>
        <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400">
          {new Date(molecule.timestamp).toLocaleDateString()}
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">{atomSummary(molecule.molecule)}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onLoad(molecule)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          <ExternalLink size={16} /> Load
        </button>
        <button
          type="button"
          onClick={() => onRemove(molecule.id)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-red-400/50 hover:text-red-200"
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
