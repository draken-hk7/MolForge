/**
 * Render a confidence score bar.
 * @param {{confidence: number}} props Component props.
 * @returns {JSX.Element} Confidence bar.
 */
export default function ConfidenceBar({ confidence = 0 }) {
  const percent = Math.round(Math.max(0, Math.min(1, Number(confidence))) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Confidence</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-indigo-400 transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
