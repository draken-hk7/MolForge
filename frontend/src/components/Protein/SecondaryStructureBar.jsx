import { getSecondaryStructureColor } from '../../utils/proteinFormatters';
import { formatPercent } from '../../utils/propertyFormatters';

export default function SecondaryStructureBar({ secondary = {}, compact = false }) {
  const helix = Number(secondary.helix_pct ?? secondary.helix ?? 0);
  const sheet = Number(secondary.sheet_pct ?? secondary.sheet ?? 0);
  const loop = Number(secondary.loop_pct ?? secondary.loop ?? Math.max(0, 100 - helix - sheet));
  const total = helix + sheet + loop || 1;
  const segments = [
    { key: 'helix', label: 'Helix', value: (helix / total) * 100 },
    { key: 'sheet', label: 'Sheet', value: (sheet / total) * 100 },
    { key: 'loop', label: 'Loop', value: (loop / total) * 100 }
  ];

  return (
    <div>
      <div className={`flex w-full overflow-hidden rounded-lg bg-white/5 ${compact ? 'h-3' : 'h-6'}`}>
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="grid min-w-0 place-items-center text-[10px] font-semibold text-white transition-all"
            style={{ width: `${segment.value}%`, backgroundColor: getSecondaryStructureColor(segment.key) }}
            title={`${segment.label} ${formatPercent(segment.value, 1)}`}
          >
            {!compact && segment.value >= 14 ? formatPercent(segment.value, 0) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
        {segments.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getSecondaryStructureColor(segment.key) }} />
            {segment.label} {formatPercent(segment.value, 1)}
          </span>
        ))}
      </div>
    </div>
  );
}
