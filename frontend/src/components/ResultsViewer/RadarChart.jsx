import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

import { PROPERTY_DEFINITIONS, normalizePropertyValue } from '../../utils/propertyFormatters';

/**
 * Build normalized radar chart data.
 * @param {object | null} original Original property map.
 * @param {object | null} modified Modified property map.
 * @returns {Array<object>} Radar chart rows.
 */
function buildRadarData(original, modified) {
  return Object.keys(PROPERTY_DEFINITIONS).map((key) => ({
    property: PROPERTY_DEFINITIONS[key].label,
    original: normalizePropertyValue(key, original?.[key]?.value),
    modified: normalizePropertyValue(key, modified?.[key]?.value)
  }));
}

/**
 * Render a property radar chart comparing two molecules.
 * @param {{original: object, modified: object}} props Component props.
 * @returns {JSX.Element} Radar chart component.
 */
export default function RadarChart({ original, modified }) {
  const data = buildRadarData(original, modified);

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-white">Property Shape</h2>
        <p className="text-xs text-slate-400">Normalized 0-100 comparison</p>
      </div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={data} margin={{ top: 24, right: 42, bottom: 24, left: 42 }}>
            <PolarGrid stroke="rgba(255,255,255,0.12)" />
            <PolarAngleAxis dataKey="property" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Radar name="Original" dataKey="original" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} strokeWidth={2} />
            <Radar name="Modified" dataKey="modified" stroke="#22c55e" fill="#22c55e" fillOpacity={0.13} strokeWidth={2} />
            <Legend wrapperStyle={{ color: '#e2e8f0' }} />
            <Tooltip
              contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
