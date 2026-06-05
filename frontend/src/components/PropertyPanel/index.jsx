import { Activity, Database, Loader2 } from 'lucide-react';
import { useState } from 'react';

import MPComparisonView from '../MaterialsProject/MPComparisonView';
import MPStatusBadge from '../MaterialsProject/MPStatusBadge';
import { useProperties } from '../../hooks/useProperties';
import { useMoleculeStore } from '../../store/moleculeStore';
import { propertyEntries } from '../../utils/propertyFormatters';
import PropertyCard from './PropertyCard';

/**
 * Render material property predictions for the active molecule.
 * @returns {JSX.Element} Property panel.
 */
export default function PropertyPanel() {
  const { currentProperties, modifiedProperties, mpData, isLoading, error, predictActiveProperties } = useProperties();
  const { predictionSettings } = useMoleculeStore();
  const [viewMode, setViewMode] = useState('auto');
  const displayProperties = modifiedProperties || currentProperties;
  const entries = propertyEntries(displayProperties);
  const showMpData = mpData && predictionSettings.showMpComparison && (viewMode === 'auto' || viewMode === 'mp');
  const deltas =
    currentProperties && modifiedProperties
      ? Object.keys(modifiedProperties).reduce((acc, key) => {
          acc[key] = Number(modifiedProperties[key].value) - Number(currentProperties[key].value);
          return acc;
        }, {})
      : {};

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Properties</h2>
          <p className="text-xs text-slate-400">Band gap, mechanics, transport, and optics</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <MPStatusBadge />
          {mpData && (
            <button
              type="button"
              onClick={() => setViewMode(showMpData ? 'ml' : 'mp')}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-400/50 hover:text-white"
            >
              <Database size={16} /> {viewMode === 'mp' || showMpData ? 'ML Data' : 'MP Data'}
            </button>
          )}
          <button
            type="button"
            onClick={predictActiveProperties}
            disabled={isLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
            Predict
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      {showMpData ? (
        <MPComparisonView mpData={mpData} />
      ) : isLoading && entries.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
          ))}
        </div>
      ) : entries.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {entries.map((entry) => (
            <PropertyCard key={entry.key} propertyKey={entry.key} delta={deltas[entry.key]} {...entry} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
          Property predictions will appear after a molecule is loaded.
        </div>
      )}
    </section>
  );
}
