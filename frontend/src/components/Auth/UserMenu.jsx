import { Cloud, FolderOpen, LogOut, Settings, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

export default function UserMenu() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  if (!auth.user) {
    return <button type="button" onClick={auth.openAuth} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-400/50"><UserRound size={16} /> Sign in</button>;
  }

  const name = auth.profile?.full_name || auth.user.email?.split('@')[0] || 'Researcher';
  const links = [
    ['/profile', 'Profile', UserRound],
    ['/library', 'My molecules', FolderOpen],
    ['/workspaces', 'Workspaces', Users],
    ['/cloud', 'Cloud compute', Cloud],
    ['/settings', 'Settings', Settings]
  ];

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-emerald-500/15 text-sm font-bold text-emerald-200">{name.slice(0, 1).toUpperCase()}</span>
        <span className="hidden sm:block"><span className="block max-w-28 truncate text-xs font-semibold text-white">{name}</span><span className="block text-[10px] uppercase text-emerald-300">{auth.profile?.tier || 'free'}</span></span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-lg border border-white/10 bg-[#15151f] p-2 shadow-2xl">
          {links.map(([to, label, Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"><Icon size={16} /> {label}</NavLink>)}
          {auth.profile?.tier === 'max' && <div className="mx-2 my-1 rounded-md bg-black/25 px-2 py-2 font-mono text-[10px] text-indigo-200">API key: {auth.profile.api_key || 'Generating...'}</div>}
          <button type="button" onClick={auth.signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  );
}
