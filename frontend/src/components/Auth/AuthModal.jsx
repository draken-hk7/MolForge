import { Github, KeyRound, Mail, X } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/classNames';

const tabs = ['login', 'signup', 'magic'];

export default function AuthModal() {
  const auth = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!auth.authModalOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (tab === 'login') await auth.signIn(email, password);
      if (tab === 'signup') {
        await auth.signUp(email, password, fullName);
        setMessage('Check your email to confirm your account.');
      }
      if (tab === 'magic') {
        await auth.magicLink(email);
        setMessage('Magic link sent.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-sm" onMouseDown={auth.closeAuth}>
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-[#111119] p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">MolForge account</h2>
            <p className="text-xs text-slate-400">Save and collaborate across devices</p>
          </div>
          <button type="button" onClick={auth.closeAuth} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:text-white" title="Close">
            <X size={17} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 rounded-lg border border-white/10 bg-black/20 p-1">
          {tabs.map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={cn('rounded-md px-2 py-2 text-xs font-semibold capitalize', tab === item ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white')}>
              {item === 'magic' ? 'Magic link' : item}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === 'signup' && <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60" />}
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60" />
          {tab !== 'magic' && <input type="password" minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60" />}
          <button disabled={busy || !auth.configured} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
            {tab === 'magic' ? <Mail size={16} /> : <KeyRound size={16} />} {busy ? 'Working...' : tab === 'login' ? 'Sign in' : tab === 'signup' ? 'Create account' : 'Send magic link'}
          </button>
        </form>

        <div className="my-4 h-px bg-white/10" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => auth.oauth('google')} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-indigo-400/50">Google</button>
          <button type="button" onClick={() => auth.oauth('github')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-indigo-400/50"><Github size={16} /> GitHub</button>
        </div>
        {message && <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">{message}</p>}
        {!auth.configured && <p className="mt-3 text-xs text-amber-300">Supabase Auth is not configured in this environment.</p>}
      </section>
    </div>
  );
}
