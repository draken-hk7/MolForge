import { Download, ShieldCheck } from 'lucide-react';

import { compareMlToMp, formatMPProperty } from '../../utils/mpDataFormatters';
import { formatPercent, formatPropertyValue } from '../../utils/propertyFormatters';

/**
 * Build comparison rows from reconciled MP data.
 * @param {object} mpData Reconciled backend payload.
 * @returns {Array<object>} Comparison rows.
 */
function buildRows(mpData) {
  return Object.entries(mpData?.reconciled || {}).map(([key, value]) => ({
    key,
    label: formatMPProperty(key, value.mp).label,
    ml: value.ml,
    mp: value.mp,
    mlKey: value.ml_key,
    comparison: compareMlToMp(value.ml, value.mp, key)
  }));
}

/**
 * Render a side-by-side ML versus Materials Project comparison.
 * @param {{mpData: object}} props Component props.
 * @returns {JSX.Element} Comparison view.
 */
export default function MPComparisonView({ mpData }) {
  const rows = buildRows(mpData);
  const matched = rows.filter((row) => row.comparison.delta_pct !== null);
  const avgDeviation =
    matched.length > 0 ? matched.reduce((sum, row) => sum + Math.abs(row.comparison.delta_pct), 0) / matched.length : null;

  const exportCsv = () => {
    const lines = ['property,ml_value,mp_value,delta_percent'];
    rows.forEach((row) => {
      lines.push([row.label, row.ml ?? '', row.mp ?? '', row.comparison.delta_pct ?? ''].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'molforge-ml-vs-mp.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!mpData) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
        MP comparison data is not loaded.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck size={17} className="text-blue-200" />
              {matched.length} properties matched
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {avgDeviation === null ? 'No numeric overlap yet' : `Average deviation ${formatPercent(avgDeviation, 1)}`}
            </div>
          </div>
          {mpData.best_match && <span className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100">Data verified by Materials Project</span>}
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-blue-400/50 hover:text-white"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3 text-indigo-200">Local ML</th>
              <th className="px-3 py-3 text-blue-200">Materials Project</th>
              <th className="px-3 py-3">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const mpFormatted = formatMPProperty(row.key, row.mp).formatted;
              const mlMissing = row.ml === null || row.ml === undefined;
              const mpMissing = mpFormatted === 'n/a';
              const deltaMissing = row.comparison.delta_pct === null;
              return (
                <tr key={row.key} className="border-t border-white/5">
                  <td className="px-3 py-3 font-medium text-white">{row.label}</td>
                  <td className={`px-3 py-3 font-mono ${mlMissing ? 'text-slate-500 italic' : 'text-indigo-100'}`}>
                    {mlMissing ? 'n/a' : formatPropertyValue(row.mlKey || row.key, row.ml)}
                  </td>
                  <td className={`px-3 py-3 font-mono ${mpMissing ? 'text-slate-500 italic' : 'text-blue-100'}`}>{mpFormatted}</td>
                  <td className={`px-3 py-3 font-mono ${deltaMissing ? 'text-slate-500 italic' : 'text-slate-300'}`}>
                    {deltaMissing ? 'n/a' : formatPercent(row.comparison.delta_pct, 1, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
