import { CheckCircle2, KeyRound, Loader2, WifiOff } from 'lucide-react';
import { useState } from 'react';

import { useMaterialsProject } from '../../hooks/useMaterialsProject';
import { cn } from '../../utils/classNames';

/**
 * Render Materials Project connection status and API-key popover.
 * @returns {JSX.Element} MP status badge.
 */
export default function MPStatusBadge() {
  const { mpStatus, setApiKey, isLoading } = useMaterialsProject();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKeyInput] = useState('');
  const [message, setMessage] = useState('');
  const connected = mpStatus.key_set && mpStatus.available;
  const noKey = !mpStatus.key_set;
  const label = connected ? 'MP Connected' : noKey ? 'MP Available' : 'MP Offline';
  const colorClass = connected ? 'bg-emerald-400' : noKey ? 'bg-amber-400' : 'bg-slate-500';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await setApiKey(apiKey);
    setMessage(result.message);
    if (result.valid) {
      setApiKeyInput('');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-blue-400/50 hover:text-white"
      >
        <span className={cn('h-2.5 w-2.5 rounded-full', colorClass)} />
        {label}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-white/10 bg-[#12121a] p-4 shadow-2xl">
          <div className="mb-3 flex items-start gap-2">
            {connected ? <CheckCircle2 size={18} className="text-emerald-300" /> : noKey ? <KeyRound size={18} className="text-amber-300" /> : <WifiOff size={18} className="text-slate-400" />}
            <div>
              <div className="text-sm font-semibold text-white">{label}</div>
              <div className="text-xs text-slate-400">{mpStatus.message || 'Materials Project status is available from the backend.'}</div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="mpapikey_xxxxxxxxxxxx"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-blue-100 outline-none focus:border-blue-400/60"
            />
            <button
              type="submit"
              disabled={isLoading || !apiKey.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <KeyRound size={16} />}
              Validate & Save
            </button>
          </form>
          {message && <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">{message}</div>}
        </div>
      )}
    </div>
  );
}
