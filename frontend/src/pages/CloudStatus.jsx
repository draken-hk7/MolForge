import { Cloud, Cpu, Database, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

import CloudJobStatus from '../components/CloudCompute/CloudJobStatus';
import { useCloudCompute } from '../hooks/useCloudCompute';

export default function CloudStatus() {
  const cloud = useCloudCompute();
  const { loadStats } = cloud;
  const [smiles, setSmiles] = useState('CCO');
  useEffect(() => { loadStats(); }, [loadStats]);
  const providers = cloud.stats?.providers_available || {};
  return (
    <div className="space-y-4"><div><h1 className="text-2xl font-semibold text-white">Cloud compute</h1><p className="text-sm text-slate-400">Optional quantum calculations and growing result cache</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(providers).map(([name, available]) => <div key={name} className="glass-panel rounded-lg p-4"><div className="flex items-center justify-between"><Cpu size={17} className={available ? 'text-emerald-300' : 'text-slate-600'} /><span className={`h-2 w-2 rounded-full ${available ? 'bg-emerald-400' : 'bg-slate-600'}`} /></div><div className="mt-3 text-sm font-semibold capitalize text-white">{name.replace('_', ' ')}</div><div className="text-xs text-slate-500">{available ? 'Available' : 'Not configured'}</div></div>)}</div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><section className="glass-panel rounded-lg p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Cloud size={16} /> Submit xTB calculation</h2><div className="flex gap-2"><input value={smiles} onChange={(event) => setSmiles(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-indigo-200 outline-none" /><button type="button" onClick={() => cloud.submit(smiles)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white"><Play size={15} /> Submit</button></div><div className="mt-3"><CloudJobStatus job={cloud.job} error={cloud.error} /></div></section><section className="glass-panel rounded-lg p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Database size={16} /> Result cache</h2><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-md bg-black/20 p-3"><div className="text-xl font-bold text-white">{cloud.stats?.jobs_completed || 0}</div><div className="text-[10px] uppercase text-slate-500">Completed</div></div><div className="rounded-md bg-black/20 p-3"><div className="text-xl font-bold text-white">{cloud.stats?.molecules_calculated || 0}</div><div className="text-[10px] uppercase text-slate-500">Molecules</div></div></div></section></div></div>
  );
}
