import { Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { useCollaboration } from '../../hooks/useCollaboration';

export default function WorkspacePanel({ onCreated }) {
  const collaboration = useCollaboration();
  const [name, setName] = useState('');

  const create = async (event) => {
    event.preventDefault();
    const workspace = await collaboration.createWorkspace({ name, description: '', is_public: false });
    setName('');
    onCreated?.(workspace);
  };

  return (
    <form onSubmit={create} className="glass-panel rounded-lg p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Users size={16} /> New workspace</h2>
      <div className="flex gap-2"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Workspace name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60" /><button className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500 text-white" title="Create workspace"><Plus size={17} /></button></div>
    </form>
  );
}
