import { Activity, BarChart3, Database, Download, FlaskConical, Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';

const TARGET_SAMPLES = 50000;
const SOURCE_LABELS = {
  qm9_dataset: 'QM9',
  xtb_batch: 'xTB',
  mp_reconcile: 'Materials Project',
  user_correction: 'User feedback'
};

export default function Admin() {
  const auth = useAuth();
  const [feedback, setFeedback] = useState(null);
  const [cloud, setCloud] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runningAction, setRunningAction] = useState('');
  const [message, setMessage] = useState('');

  const loadStats = useCallback(async () => {
    if (auth.profile?.tier !== 'admin') return;
    const [feedbackResult, cloudResult, runsResult] = await Promise.allSettled([
      api.get('/api/feedback/stats'),
      api.get('/api/cloud/stats'),
      api.get('/api/cloud/training-runs')
    ]);
    if (feedbackResult.status === 'fulfilled') setFeedback(feedbackResult.value.data);
    if (cloudResult.status === 'fulfilled') setCloud(cloudResult.value.data);
    if (runsResult.status === 'fulfilled') setRuns(runsResult.value.data);
  }, [auth.profile?.tier]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const training = cloud?.training_data || { total: 0, by_source: {} };
  const benchmarkHistory = cloud?.benchmark_history || [];
  const latestBenchmark = benchmarkHistory.at(-1);
  const progress = Math.min(100, Math.round((training.total / TARGET_SAMPLES) * 100));
  const sourceRows = useMemo(() => [
    ['qm9_dataset', training.by_source?.qm9_dataset || 0],
    ['xtb_batch', training.by_source?.xtb_batch || 0],
    ['mp_reconcile', feedback?.feedback_by_source?.mp_reconcile || 0],
    ['user_correction', feedback?.feedback_by_source?.user_correction || 0]
  ], [feedback?.feedback_by_source, training.by_source]);

  async function runPipeline(action, limit) {
    setRunningAction(action);
    setMessage('');
    try {
      const { data } = await api.post(`/api/cloud/training/${action}`, { limit });
      setMessage(`${data.label} queued.`);
      await loadStats();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRunningAction('');
    }
  }

  function exportStats() {
    const blob = new Blob([JSON.stringify({ feedback, cloud, runs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'molforge-training-stats.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (auth.profile?.tier !== 'admin') return <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">Admin access required.</div>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Native AI training</h1>
          <p className="text-sm text-slate-400">Private data generation, quality, and benchmark operations</p>
        </div>
        <div className="flex gap-2">
          <button title="Refresh stats" onClick={loadStats} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"><RefreshCw size={16} /></button>
          <button onClick={exportStats} className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"><Download size={16} /> Export stats</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Database, 'Training samples', training.total.toLocaleString(), 'text-cyan-300'],
          [BarChart3, 'Target progress', `${progress}%`, 'text-indigo-300'],
          [Activity, 'Latest ML accuracy', latestBenchmark ? `${latestBenchmark.ml_accuracy}%` : 'No run', 'text-amber-300'],
          [FlaskConical, 'Feedback rows', (feedback?.total_feedback || 0).toLocaleString(), 'text-emerald-300']
        ].map(([Icon, label, value, color]) => (
          <div key={label} className="glass-panel rounded-lg p-4">
            <Icon size={17} className={color} />
            <div className="mt-3 text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <section className="glass-panel rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Data generation</h2>
            <p className="mt-1 text-xs text-slate-500">{training.total.toLocaleString()} of {TARGET_SAMPLES.toLocaleString()} minimum samples</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[['qm9', 'Run QM9 Import', null], ['xtb', 'Run xTB Batch', 5000], ['benchmark', 'Run Benchmark', 50]].map(([action, label, limit]) => (
              <button key={action} disabled={Boolean(runningAction)} onClick={() => runPipeline(action, limit)} className="inline-flex items-center gap-2 rounded-md border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20 disabled:cursor-wait disabled:opacity-50">
                {runningAction === action ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded bg-white/5"><div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all" style={{ width: `${progress}%` }} /></div>
        {message && <p className="mt-3 text-xs text-cyan-200">{message}</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {sourceRows.map(([source, count]) => <div key={source} className="border-l border-white/10 pl-3"><div className="text-lg font-semibold text-white">{count.toLocaleString()}</div><div className="text-xs text-slate-500">{SOURCE_LABELS[source]}</div></div>)}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <section className="glass-panel min-h-[310px] rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white">Accuracy over time</h2>
          <div className="mt-4 h-64">
            {benchmarkHistory.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={benchmarkHistory}>
                  <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(148,163,184,.2)', borderRadius: 6 }} />
                  <Line type="monotone" dataKey="ml_accuracy" name="Local ML" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="xtb_accuracy" name="xTB" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">Run the benchmark to establish an accuracy baseline.</div>}
          </div>
        </section>

        <section className="glass-panel rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white">Recent pipeline runs</h2>
          <div className="mt-3 space-y-2">
            {runs.length ? runs.slice(0, 6).map((run) => (
              <div key={run.id} className="flex items-center justify-between border-b border-white/5 py-2 text-xs">
                <div><div className="font-medium text-slate-200">{run.label}</div><div className="text-slate-500">{run.limit ? `${run.limit.toLocaleString()} item limit` : 'Full dataset'}</div></div>
                <span className={`rounded border px-2 py-1 ${run.status === 'completed' ? 'border-emerald-400/20 text-emerald-300' : run.status === 'failed' ? 'border-rose-400/20 text-rose-300' : 'border-cyan-400/20 text-cyan-300'}`}>{run.status}</span>
              </div>
            )) : <p className="py-8 text-center text-xs text-slate-500">No pipeline runs in this API session.</p>}
          </div>
        </section>
      </div>

      <section className="glass-panel rounded-lg p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Most corrected properties</h2>
        {(feedback?.top_corrected_properties || []).length ? (feedback.top_corrected_properties.map(([name, count]) => <div key={name} className="flex justify-between border-b border-white/5 py-2 text-sm"><span className="text-slate-300">{name}</span><span className="text-indigo-200">{count}</span></div>)) : <p className="text-xs text-slate-500">No corrections collected yet.</p>}
      </section>
    </div>
  );
}
