import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '../../utils/classNames';
import { deltaTone, formatDelta, formatPropertyValue } from '../../utils/propertyFormatters';
import ConfidenceBar from './ConfidenceBar';

/**
 * Render one material property card.
 * @param {object} props Component props.
 * @returns {JSX.Element} Property card.
 */
export default function PropertyCard({ propertyKey, label, value, unit, confidence, color, delta }) {
  const [flash, setFlash] = useState(false);
  const tone = deltaTone(propertyKey, delta);
  const TrendIcon = tone === 'positive' ? TrendingUp : tone === 'negative' ? TrendingDown : Minus;

  useEffect(() => {
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 900);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <article
      className={cn('rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition', flash && 'animate-flash')}
      style={{ boxShadow: `inset 0 1px 0 ${color}22` }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
          <p className="text-xs text-slate-500">{unit}</p>
        </div>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0 text-2xl font-bold text-white">
          {formatPropertyValue(propertyKey, value)}
        </div>
        {Number.isFinite(Number(delta)) && (
          <div
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold',
              tone === 'positive' && 'bg-emerald-500/12 text-emerald-300',
              tone === 'negative' && 'bg-red-500/12 text-red-300',
              tone === 'neutral' && 'bg-white/8 text-slate-400'
            )}
          >
            <TrendIcon size={13} />
            {formatDelta(propertyKey, delta)}
          </div>
        )}
      </div>
      <ConfidenceBar confidence={confidence} />
    </article>
  );
}
