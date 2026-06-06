import { KeyRound, UserRound } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { api } from '../../utils/api';

export default function Profile() {
  const auth = useAuth();
  const [fullName, setFullName] = useState(auth.profile?.full_name || '');
  const [username, setUsername] = useState(auth.profile?.username || '');
  const [message, setMessage] = useState('');

  if (!auth.user) return <button type="button" onClick={auth.openAuth} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white">Sign in</button>;

  const save = async (event) => {
    event.preventDefault();
    try {
      try {
        await api.put('/api/auth/profile', { full_name: fullName, username });
      } catch {
        const { error } = await supabase.from('profiles').update({ full_name: fullName, username }).eq('id', auth.user.id);
        if (error) throw error;
      }
      await auth.refreshProfile();
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-semibold text-white">Profile</h1><p className="text-sm text-slate-400">{auth.user.email}</p></div>
      <form onSubmit={save} className="glass-panel space-y-4 rounded-lg p-5">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-lg bg-indigo-500/15 text-indigo-200"><UserRound /></span><div><div className="text-sm font-semibold text-white">Research identity</div><div className="text-xs uppercase text-emerald-300">{auth.profile?.tier || 'free'} tier</div></div></div>
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60" />
        <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60" />
        <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Save profile</button>
        {message && <div className="text-xs text-slate-300">{message}</div>}
      </form>
      <div className="glass-panel rounded-lg p-5"><div className="flex items-center gap-2 text-sm font-semibold text-white"><KeyRound size={16} /> Daily usage</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, ((auth.profile?.predictions_today || 0) / 10) * 100)}%` }} /></div><div className="mt-2 text-xs text-slate-400">{auth.profile?.predictions_today || 0} of 10 free predictions used today</div></div>
    </div>
  );
}
