import { BarChart3, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';

export default function Admin() {
  const auth = useAuth();
  const [stats, setStats] = useState(null);
  useEffect(() => { if (auth.profile?.tier === 'admin') api.get('/api/feedback/stats').then(({ data }) => setStats(data)).catch(() => setStats(null)); }, [auth.profile?.tier]);
  if (auth.profile?.tier !== 'admin') return <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">Admin access required.</div>;
  return <div className="space-y-4"><div className="flex items-end justify-between"><div><h1 className="text-2xl font-semibold text-white">Learning dashboard</h1><p className="text-sm text-slate-400">Private Native AI training feedback</p></div><button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"><Download size={16} /> Export CSV</button></div><div className="grid gap-3 md:grid-cols-3">{[['Feedback', stats?.total_feedback || 0], ['Average rating', stats?.average_rating || '—'], ['Sources', Object.keys(stats?.feedback_by_source || {}).length]].map(([label, value]) => <div key={label} className="glass-panel rounded-lg p-4"><BarChart3 size={17} className="text-indigo-300" /><div className="mt-3 text-2xl font-bold text-white">{value}</div><div className="text-xs text-slate-500">{label}</div></div>)}</div><section className="glass-panel rounded-lg p-4"><h2 className="mb-3 text-sm font-semibold text-white">Most corrected properties</h2>{(stats?.top_corrected_properties || []).map(([name, count]) => <div key={name} className="flex justify-between border-b border-white/5 py-2 text-sm"><span className="text-slate-300">{name}</span><span className="text-indigo-200">{count}</span></div>)}</section></div>;
}
