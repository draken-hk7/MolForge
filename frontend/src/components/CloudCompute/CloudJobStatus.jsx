import { Check, CheckCircle2, Cloud, Loader2, Timer, XCircle } from 'lucide-react';

const stepLabels = ['Generating 3D geometry', 'Uploading to compute', 'Running gas-phase xTB', 'Running ALPB water xTB', 'Parsing and updating results'];

function stepState(index, progress, failed) {
  if (failed) return index === 0 ? 'failed' : 'waiting';
  const threshold = [8, 20, 38, 68, 92][index];
  if (progress >= threshold + 12) return 'done';
  if (progress >= threshold) return 'active';
  return 'waiting';
}

export default function CloudJobStatus({ job, error, progress = 0, eta = 0 }) {
  if (!job && !error) return null;
  const status = job?.status;
  const complete = status === 'completed';
  const failed = status === 'failed' || Boolean(error);
  const displayedProgress = complete ? 100 : Math.max(progress, Number(job?.progress_pct ?? job?.progress ?? 0));

  return (
    <section className={`rounded-lg border p-4 ${failed ? 'border-slate-500/20 bg-slate-500/[0.06]' : 'border-emerald-400/20 bg-emerald-500/[0.06]'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          {complete ? <CheckCircle2 size={17} className="text-emerald-300" /> : failed ? <XCircle size={17} className="text-slate-400" /> : status === 'queued' ? <Cloud size={17} className="text-amber-300" /> : <Loader2 size={17} className="animate-spin text-emerald-300" />}
          {complete ? 'Results verified by Cloud xTB' : failed ? 'Cloud calculation unavailable' : status === 'queued' ? 'Preparing accurate calculation' : 'Running accurate cloud calculation'}
        </div>
        <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">{job?.provider || 'ML fallback'}</span>
      </div>

      {!complete && !failed && (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-8 animate-pulse rounded-md bg-white/[0.07]" />)}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
            <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: `${displayedProgress}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>{displayedProgress}%</span>
            <span className="flex items-center gap-1"><Timer size={12} /> {eta > 0 ? `~${eta} seconds remaining` : 'Finishing calculation'}</span>
          </div>
          <div className="mt-4 grid gap-1.5">
            {stepLabels.map((label, index) => {
              const state = stepState(index, displayedProgress, failed);
              return <div key={label} className={`flex items-center gap-2 text-xs ${state === 'done' ? 'text-emerald-300' : state === 'active' ? 'text-white' : 'text-slate-500'}`}>{state === 'done' ? <Check size={13} /> : state === 'active' ? <Loader2 size={13} className="animate-spin" /> : <span className="h-3 w-3 rounded-full border border-slate-600" />}{label}</div>;
            })}
          </div>
        </>
      )}

      {complete && <p className="mt-2 text-xs text-emerald-200">Cloud-native values replaced matching ML estimates. Derived values remain labeled as screening proxies.</p>}
      {failed && <p className="mt-2 text-xs text-slate-400">{error || job?.error || 'Showing the immediate local ML prediction instead.'}</p>}
    </section>
  );
}
