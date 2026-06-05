import { Clock3 } from 'lucide-react';

import { useMoleculeStore } from '../../store/moleculeStore';

/**
 * Render recent molecule workflow history.
 * @returns {JSX.Element} History log component.
 */
export default function HistoryLog() {
  const { sessionHistory } = useMoleculeStore();

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex items-center gap-2">
        <Clock3 size={18} className="text-indigo-300" />
        <h2 className="text-base font-semibold text-white">History</h2>
      </div>
      {sessionHistory.length > 0 ? (
        <ol className="space-y-3">
          {sessionHistory.slice(0, 8).map((entry) => (
            <li key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-white">{entry.name}</span>
                <span className="shrink-0 text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="mono-smiles mt-1 truncate text-xs text-indigo-200">{entry.smiles}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">Session events will appear here.</div>
      )}
    </section>
  );
}
