import { CheckCircle2, Cloud, Loader2, XCircle } from 'lucide-react';

export default function CloudJobStatus({ job, error }) {
  if (!job && !error) return null;
  if (error) return <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>;
  const complete = job.status === 'completed';
  const failed = job.status === 'failed';
  return (
    <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">{complete ? <CheckCircle2 size={15} className="text-emerald-300" /> : failed ? <XCircle size={15} className="text-red-300" /> : job.status === 'queued' ? <Cloud size={15} className="text-amber-300" /> : <Loader2 size={15} className="animate-spin text-emerald-300" />} {complete ? 'Cloud calculation complete' : failed ? 'Cloud calculation failed' : 'Accurate cloud calculation queued'}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${job.progress ?? (complete ? 100 : 12)}%` }} /></div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>{job.provider || 'local'} / xTB</span><span>{job.eta_seconds ? `ETA ${job.eta_seconds}s` : job.status}</span></div>
      {job.result?.homo_lumo_gap_ev != null && <div className="mt-2 text-xs text-emerald-200">HOMO-LUMO gap: {job.result.homo_lumo_gap_ev} eV</div>}
    </div>
  );
}
