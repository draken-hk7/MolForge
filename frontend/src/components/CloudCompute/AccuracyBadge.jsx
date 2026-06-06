const styles = {
  ml: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  mp: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  xtb: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  dft: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
};

export default function AccuracyBadge({ source = 'ml' }) {
  const labels = { ml: 'Local ML', mp: 'MP Database', xtb: 'Cloud xTB', dft: 'Cloud DFT' };
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${styles[source] || styles.ml}`}>{labels[source] || labels.ml}</span>;
}
