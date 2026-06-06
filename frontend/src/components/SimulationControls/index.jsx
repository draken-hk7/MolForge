import { Atom, Loader2 } from 'lucide-react';

import { useSimulation } from '../../hooks/useSimulation';
import { formatNumber } from '../../utils/propertyFormatters';

/**
 * Render simulation controls for geometry optimization.
 * @returns {JSX.Element} Simulation controls component.
 */
export default function SimulationControls() {
  const { result, isOptimizing, optimizeActiveGeometry } = useSimulation();

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Simulation</h2>
          <p className="text-xs text-slate-400">MMFF94 and ASE EMT geometry pass</p>
        </div>
        <button
          type="button"
          onClick={optimizeActiveGeometry}
          disabled={isOptimizing}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/40 bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOptimizing ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Atom size={16} />}
          Optimize
        </button>
      </div>
      {result ? (
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-black/25 p-3">
            <div className="text-xs text-slate-500">Energy</div>
            <div className="font-mono text-white">{formatNumber(result.result.energy_ev, 3)} eV</div>
          </div>
          <div className="rounded-lg bg-black/25 p-3">
            <div className="text-xs text-slate-500">Forces max</div>
            <div className="font-mono text-white">{formatNumber(result.result.forces_max, 3)}</div>
          </div>
          <div className="rounded-lg bg-black/25 p-3">
            <div className="text-xs text-slate-500">Method</div>
            <div className="font-mono text-white">{result.result.method}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">
          <Atom className="mb-3 text-indigo-300" size={32} />
          <div className="font-medium text-slate-300">No simulation result</div>
          <p className="mt-1 text-sm text-slate-400">Optimization results will appear here.</p>
        </div>
      )}
    </section>
  );
}
