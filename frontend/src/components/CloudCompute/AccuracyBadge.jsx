const badges = {
  ml: {
    label: 'Local ML',
    style: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
    tooltip: 'Local ML: Immediate descriptor-based screening estimate. Validate critical decisions with experimental or quantum-chemistry data.'
  },
  mp: {
    label: 'MP Database',
    style: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
    tooltip: 'Materials Project: Published or computed periodic-material data returned by the Materials Project API.'
  },
  xtb: {
    label: 'Cloud xTB',
    style: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    tooltip: 'Cloud xTB: GFN2-xTB semiempirical quantum-chemistry calculation. Best used for rapid molecular screening, geometry, energies, and native electronic descriptors.'
  },
  derived: {
    label: 'xTB Derived',
    style: 'border-lime-400/30 bg-lime-500/10 text-lime-200',
    tooltip: 'xTB Derived: Screening estimate derived from an xTB-native quantity. Read the method note before interpretation.'
  },
  dft: {
    label: 'Cloud DFT',
    style: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
    tooltip: 'Cloud DFT: Higher-level quantum calculation. Accuracy depends on method, basis, geometry, and target property.'
  }
};

const aliases = {
  local_ml: 'ml',
  cloud_xtb: 'xtb',
  cloud_xtb_derived: 'derived',
  cloud_dft: 'dft',
  materials_project: 'mp'
};

export default function AccuracyBadge({ source = 'ml', method = '', note = '' }) {
  const badge = badges[aliases[source] || source] || badges.ml;
  const title = [badge.tooltip, method, note].filter(Boolean).join(' ');
  return <span title={title} className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${badge.style}`}>{badge.label}</span>;
}
