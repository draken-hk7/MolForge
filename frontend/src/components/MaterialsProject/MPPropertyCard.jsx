import { Info } from 'lucide-react';

import { cn } from '../../utils/classNames';
import { compareMlToMp, formatMPProperty } from '../../utils/mpDataFormatters';
import { formatPropertyValue } from '../../utils/propertyFormatters';

/**
 * Render one MP-vs-ML property card.
 * @param {object} props Component props.
 * @returns {JSX.Element} MP property card.
 */
export default function MPPropertyCard({ propertyKey, mlKey, mlValue, mpValue, source = 'mp' }) {
  const formatted = formatMPProperty(propertyKey, mpValue);
  const comparison = compareMlToMp(mlValue, mpValue, propertyKey);
  const deltaClass =
    comparison.delta_pct === null
      ? 'bg-white/10 text-slate-300'
      : Math.abs(comparison.delta_pct) > 50
        ? 'bg-red-500/15 text-red-200'
        : Math.abs(comparison.delta_pct) > 20
          ? 'bg-amber-500/15 text-amber-200'
          : 'bg-emerald-500/15 text-emerald-200';

  return (
    <article className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{formatted.label}</h3>
          <p className="text-xs text-slate-400">{formatted.unit || 'unitless'}</p>
        </div>
        <Info size={15} className="text-blue-200" title={`${formatted.label} from Materials Project summary data`} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Materials Project</span>
          <span className="mono-smiles text-sm font-semibold text-blue-100">{formatted.formatted}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Local ML</span>
          <span className="mono-smiles text-sm text-indigo-100">
            {mlValue === null || mlValue === undefined ? 'n/a' : formatPropertyValue(mlKey || propertyKey, mlValue)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', deltaClass)}>
          {comparison.delta_pct === null ? 'No delta' : `${comparison.delta_pct}% ${comparison.direction}`}
        </span>
        <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', source === 'mp' ? 'bg-blue-500/15 text-blue-200' : 'bg-indigo-500/15 text-indigo-200')}>
          {source === 'mp' ? 'Materials Project' : 'Local ML'}
        </span>
      </div>
    </article>
  );
}
