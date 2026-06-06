import { Activity, Beaker, Gauge, Scale } from 'lucide-react';

import { formatAminoAcid, formatPLDDT, formatProteinWeight } from '../../utils/proteinFormatters';
import { formatNumber, formatPercent } from '../../utils/propertyFormatters';
import SecondaryStructureBar from './SecondaryStructureBar';

export default function ProteinPropertyPanel({ properties, analysis, method }) {
  if (!properties) {
    return null;
  }
  const confidence = formatPLDDT(analysis?.plddt_mean);
  const composition = Object.entries(properties.amino_acid_composition || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const source = method === 'esmfold' ? 'ESMFold' : method === 'rcsb' ? 'UniProt Known Structure' : method === 'mock' ? 'Mock Structure' : 'Sequence Analysis';

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Protein Properties</h2>
          <p className="text-xs text-slate-400">BioPython ProtParam sequence analysis</p>
        </div>
        <span className="rounded-lg border border-teal-400/25 bg-teal-500/15 px-2.5 py-1.5 text-xs font-semibold text-teal-100">{source}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Molecular Weight', value: formatProteinWeight(properties.molecular_weight), icon: Scale },
          { label: 'Isoelectric Point', value: `pH ${formatNumber(properties.isoelectric_point, 3)}`, icon: Beaker },
          { label: 'Instability Index', value: `${formatNumber(properties.instability_index, 3)} - ${properties.instability_index < 40 ? 'Stable' : 'Unstable'}`, icon: Activity },
          { label: 'GRAVY', value: formatNumber(properties.gravy, 3), icon: Gauge },
          { label: 'Aromaticity', value: formatPercent(Number(properties.aromaticity) * 100, 1), icon: Beaker },
          { label: 'Mean pLDDT', value: analysis?.plddt_mean == null ? 'n/a' : `${formatNumber(analysis.plddt_mean, 3)} - ${confidence.label}`, icon: Gauge, color: confidence.color }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={14} style={{ color: item.color }} /> {item.label}</div>
              <div className={`mt-1 font-mono text-sm ${item.value === 'n/a' ? 'text-slate-500 italic' : 'text-white'}`}>{item.value}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <div className="mb-2 text-sm font-medium text-white">Secondary Structure Propensity</div>
        <SecondaryStructureBar secondary={properties.secondary_structure_fraction} compact />
      </div>
      <div className="mt-4">
        <div className="mb-2 text-sm font-medium text-white">Top Amino Acids</div>
        <div className="space-y-2">
          {composition.map(([aminoAcid, value]) => {
            const metadata = formatAminoAcid(aminoAcid);
            return (
              <div key={aminoAcid} className="grid grid-cols-[90px_minmax(0,1fr)_50px] items-center gap-2 text-xs">
                <span className="truncate text-slate-300" title={metadata.name}>{metadata.abbreviation}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(Number(value), 100)}%`, backgroundColor: metadata.color }} />
                </div>
                <span className="text-right font-mono text-slate-400">{formatPercent(value, 1)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
