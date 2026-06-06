import { Activity, Cloud, Cpu, Database, FileUp, Gauge, Play, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import CloudJobStatus from '../components/CloudCompute/CloudJobStatus';
import { useCloudCompute } from '../hooks/useCloudCompute';

const providerLabels = { oracle: 'Oracle Always Free', gcp: 'Google Cloud', local: 'Local xTB' };

export default function CloudStatus() {
  const cloud = useCloudCompute();
  const { loadStats } = cloud;
  const [smiles, setSmiles] = useState('CCO');
  const [batchSmiles, setBatchSmiles] = useState([]);
  const [batchMessage, setBatchMessage] = useState('');

  useEffect(() => { loadStats(); }, [loadStats]);

  const readBatch = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setBatchSmiles(text.split(/[\r\n,]+/).map((value) => value.trim()).filter(Boolean).slice(0, 100));
    setBatchMessage('');
  };

  const submitBatch = async () => {
    try {
      const jobs = await cloud.submitBatch(batchSmiles);
      setBatchMessage(`${jobs.length} cloud jobs submitted.`);
    } catch (error) {
      setBatchMessage(error.response?.data?.detail || error.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-white">Cloud DFT Accuracy Engine</h1><p className="text-sm text-slate-400">Optional GFN2-xTB screening, persistent cache, and graceful ML fallback</p></div>
        <button type="button" onClick={loadStats} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300" title="Refresh cloud status"><RefreshCw size={15} /></button>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {Object.entries(providerLabels).map(([key, label]) => {
          const status = cloud.providers?.[key] || {};
          return <article key={key} className="glass-panel rounded-lg p-4"><div className="flex items-center justify-between"><Cpu size={18} className={status.available ? 'text-emerald-300' : 'text-slate-600'} /><span className={`h-2.5 w-2.5 rounded-full ${status.available ? 'bg-emerald-400' : 'bg-slate-600'}`} /></div><h2 className="mt-3 text-sm font-semibold text-white">{label}</h2><p className="text-xs text-slate-500">{status.available ? 'Connected' : key === 'local' ? 'xTB not found in PATH' : 'SSH compute not configured'}</p><p className="mt-2 font-mono text-[10px] text-slate-600">{status.xtb_version || 'Version available after connection test'}</p></article>;
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="glass-panel rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Cloud size={16} /> Submit xTB calculation</h2>
            <div className="flex gap-2"><input value={smiles} onChange={(event) => setSmiles(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-indigo-200 outline-none" /><button type="button" onClick={() => cloud.submitJob(smiles)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white"><Play size={15} /> Submit</button></div>
            <div className="mt-3"><CloudJobStatus job={cloud.job} error={cloud.error} progress={cloud.progress} eta={cloud.eta} /></div>
          </section>

          <section className="glass-panel rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Activity size={16} /> Recent jobs</h2>
            <div className="space-y-2">
              {cloud.recentJobs.length === 0 && <p className="text-xs text-slate-500">Sign in and submit calculations to build your job history.</p>}
              {cloud.recentJobs.slice(0, 8).map((job) => <div key={job.job_id} className="flex items-center justify-between gap-3 border-b border-white/5 py-2 text-xs"><span className="truncate font-mono text-indigo-200">{job.input_smiles}</span><span className={job.status === 'completed' ? 'text-emerald-300' : job.status === 'failed' ? 'text-red-300' : 'text-amber-300'}>{job.status}</span>{job.status === 'failed' && <button type="button" onClick={() => cloud.submitJob(job.input_smiles)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10" title="Re-run failed job"><RefreshCw size={12} /></button>}</div>)}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="glass-panel rounded-lg p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Database size={16} /> Result cache</h2>
            <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-md bg-black/20 p-3"><div className="text-xl font-bold text-white">{cloud.cacheStats?.total_cached || 0}</div><div className="text-[10px] uppercase text-slate-500">Molecules cached</div></div><div className="rounded-md bg-black/20 p-3"><div className="text-xl font-bold text-white">{Math.round((cloud.cacheStats?.cache_hit_rate || 0) * 100)}%</div><div className="text-[10px] uppercase text-slate-500">Cache hit rate</div></div></div>
            <div className="mt-3 space-y-1">{cloud.cacheStats?.most_calculated?.map((item) => <div key={item.smiles} className="flex justify-between text-xs"><span className="truncate font-mono text-slate-300">{item.smiles}</span><span className="text-slate-500">{item.calculations}</span></div>)}</div>
          </section>

          <section className="glass-panel rounded-lg p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Gauge size={16} /> Method confidence</h2>
            <div className="mt-4 space-y-3">{[['HOMO-LUMO gap', 72], ['ALPB hydration', 62], ['Derived screening proxies', 40]].map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{value}%</span></div><div className="h-1.5 rounded-full bg-black/30"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${value}%` }} /></div></div>)}</div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Confidence is method-oriented, not a universal experimental accuracy guarantee. Solid-state properties require periodic calculations or experimental validation.</p>
          </section>

          <section className="glass-panel rounded-lg p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><FileUp size={16} /> Batch calculator</h2>
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-4 text-xs text-slate-400"><input type="file" accept=".csv,.txt" className="sr-only" onChange={readBatch} />Upload CSV or text SMILES</label>
            <button type="button" disabled={batchSmiles.length === 0} onClick={submitBatch} className="mt-2 w-full rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Submit {batchSmiles.length || ''} jobs</button>
            <p className="mt-2 text-[10px] text-slate-500">Plus and Max tiers can submit up to 100 SMILES per batch.</p>
            {batchMessage && <p className="mt-2 text-xs text-slate-300">{batchMessage}</p>}
          </section>
        </div>
      </section>
    </div>
  );
}
