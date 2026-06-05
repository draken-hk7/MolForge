import { ArrowDownUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '../../utils/classNames';
import { deltaTone, formatDelta, formatPropertyValue, PROPERTY_DEFINITIONS } from '../../utils/propertyFormatters';

/**
 * Build comparison table rows.
 * @param {object | null} original Original property map.
 * @param {object | null} modified Modified property map.
 * @returns {Array<object>} Table rows.
 */
function buildRows(original, modified) {
  return Object.keys(PROPERTY_DEFINITIONS)
    .filter((key) => original?.[key] && modified?.[key])
    .map((key) => ({
      key,
      property: PROPERTY_DEFINITIONS[key].label,
      original: Number(original[key].value),
      modified: Number(modified[key].value),
      delta: Number(modified[key].value) - Number(original[key].value),
      unit: PROPERTY_DEFINITIONS[key].unit
    }));
}

/**
 * Render a sortable property comparison table.
 * @param {{original: object, modified: object}} props Component props.
 * @returns {JSX.Element} Comparison table.
 */
export default function ComparisonTable({ original, modified }) {
  const [sortBy, setSortBy] = useState('property');
  const rows = useMemo(() => {
    const built = buildRows(original, modified);
    return built.sort((a, b) => {
      if (sortBy === 'delta') {
        return Math.abs(b.delta) - Math.abs(a.delta);
      }
      return a.property.localeCompare(b.property);
    });
  }, [modified, original, sortBy]);

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Comparison</h2>
          <p className="text-xs text-slate-400">Original versus modified properties</p>
        </div>
        <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setSortBy('property')}
            className={cn('rounded-md px-2 py-1 text-xs font-semibold', sortBy === 'property' ? 'bg-indigo-500 text-white' : 'text-slate-400')}
          >
            Name
          </button>
          <button
            type="button"
            onClick={() => setSortBy('delta')}
            className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold', sortBy === 'delta' ? 'bg-indigo-500 text-white' : 'text-slate-400')}
          >
            <ArrowDownUp size={12} /> Delta
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-white/10">
              <th className="py-3 pr-3">Original</th>
              <th className="py-3 pr-3">Property</th>
              <th className="py-3 pr-3">Modified</th>
              <th className="py-3">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tone = deltaTone(row.key, row.delta);
              return (
                <tr key={row.key} className="border-b border-white/5 last:border-0">
                  <td className="mono-smiles py-3 pr-3 text-slate-200">
                    {formatPropertyValue(row.key, row.original)} {row.unit}
                  </td>
                  <td className="py-3 pr-3 font-medium text-white">{row.property}</td>
                  <td className="mono-smiles py-3 pr-3 text-slate-200">
                    {formatPropertyValue(row.key, row.modified)} {row.unit}
                  </td>
                  <td
                    className={cn(
                      'mono-smiles py-3 font-semibold',
                      tone === 'positive' && 'text-emerald-300',
                      tone === 'negative' && 'text-red-300',
                      tone === 'neutral' && 'text-slate-400'
                    )}
                  >
                    {formatDelta(row.key, row.delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Comparison data will appear after prediction.</div>}
      </div>
    </section>
  );
}
