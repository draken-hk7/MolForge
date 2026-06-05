import { Eye, EyeOff, KeyRound, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';

import MPStatusBadge from '../components/MaterialsProject/MPStatusBadge';
import { useMaterialsProject } from '../hooks/useMaterialsProject';
import { useMoleculeStore } from '../store/moleculeStore';

/**
 * Render application settings.
 * @returns {JSX.Element} Settings page.
 */
export default function Settings() {
  const { mpStatus, setApiKey, clearCache, isLoading } = useMaterialsProject();
  const { predictionSettings, setPredictionSetting } = useMoleculeStore();
  const [apiKey, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await setApiKey(apiKey);
    setMessage(result.message);
    if (result.valid) {
      setApiKeyInput('');
    }
  };

  const handleClearCache = async () => {
    const result = await clearCache();
    setMessage(result.message);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <SettingsIcon className="text-indigo-300" size={24} /> Settings
          </h1>
          <p className="mt-1 text-sm text-slate-400">Materials Project, prediction, and cache preferences</p>
        </div>
        <MPStatusBadge />
      </div>

      <section className="glass-panel rounded-2xl p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Materials Project API</h2>
            <p className="text-xs text-slate-400">Get your free API key at materialsproject.org Dashboard API Keys</p>
          </div>
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            {mpStatus.key_set ? 'Key set' : 'No key'}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="mpapikey_xxxxxxxxxxxx"
              className="mono-smiles w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-11 text-sm text-blue-100 outline-none focus:border-blue-400/60"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:text-white"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading || !apiKey.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound size={16} /> Validate & Save
          </button>
        </form>
        <a href="https://materialsproject.org" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-blue-300 hover:text-blue-200">
          materialsproject.org
        </a>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <h2 className="mb-4 text-base font-semibold text-white">Prediction Settings</h2>
        <div className="space-y-3">
          {[
            ['autoEnrichPredictions', 'Auto-enrich predictions with MP data'],
            ['showMpComparison', 'Show ML vs MP comparison']
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-200">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={predictionSettings[key]}
                onChange={(event) => setPredictionSetting(key, event.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
            </label>
          ))}
          <label className="block rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <span className="mb-2 block text-sm text-slate-200">Preferred data source</span>
            <select
              value={predictionSettings.preferredDataSource}
              onChange={(event) => setPredictionSetting('preferredDataSource', event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#12121a] px-3 py-2 text-sm text-slate-100"
            >
              <option value="mp">MP preferred</option>
              <option value="ml">ML preferred</option>
              <option value="both">Show both</option>
            </select>
          </label>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <h2 className="mb-4 text-base font-semibold text-white">Cache</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div>
            <div className="text-sm font-semibold text-white">{mpStatus.cache_size || 0} cached MP queries</div>
            <div className="text-xs text-slate-400">Cache lives in backend memory for this session</div>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-400/50 hover:text-white"
          >
            <Trash2 size={15} /> Clear cache
          </button>
        </div>
        {message && <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">{message}</div>}
      </section>
    </div>
  );
}
