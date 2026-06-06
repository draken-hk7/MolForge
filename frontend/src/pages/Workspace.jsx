import { Mail, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import WorkspacePanel from '../components/Collaboration/WorkspacePanel';
import { useAuth } from '../hooks/useAuth';
import { useCollaboration } from '../hooks/useCollaboration';
import { api } from '../utils/api';

export default function Workspace() {
  const auth = useAuth();
  const collaboration = useCollaboration();
  const [workspaces, setWorkspaces] = useState([]);
  const [email, setEmail] = useState('');
  useEffect(() => {
    if (!auth.user) return;
    api.get('/api/collab/workspaces').then(({ data }) => setWorkspaces(data)).catch(async () => {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.from('shared_workspaces').select('*').or(`owner_id.eq.${auth.user.id},members.cs.{${auth.user.id}}`);
      setWorkspaces(data || []);
    });
  }, [auth.user]);
  if (!auth.user) return <button type="button" onClick={auth.openAuth} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white">Sign in to view workspaces</button>;
  return (
    <div className="space-y-4"><div><h1 className="text-2xl font-semibold text-white">Workspaces</h1><p className="text-sm text-slate-400">Shared molecule libraries and live research activity</p></div><WorkspacePanel onCreated={(row) => setWorkspaces((items) => [row, ...items])} /><div className="grid gap-4 md:grid-cols-2">{workspaces.map((workspace) => <section key={workspace.id} className="glass-panel rounded-lg p-4"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Users size={16} /> {workspace.name}</div><p className="mt-1 text-xs text-slate-400">{workspace.description || 'Private research workspace'}</p><div className="mt-3 text-[11px] text-slate-500">{workspace.members?.length || 0} members · {workspace.molecules?.length || 0} molecules</div><form onSubmit={async (event) => { event.preventDefault(); await collaboration.invite(workspace.id, email); setEmail(''); }} className="mt-3 flex gap-2"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Invite by email" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /><button className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500 text-white" title="Send invite"><Mail size={16} /></button></form></section>)}</div></div>
  );
}
