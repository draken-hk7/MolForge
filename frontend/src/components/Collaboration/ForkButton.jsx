import { GitFork } from 'lucide-react';
import { useState } from 'react';

import { useCollaboration } from '../../hooks/useCollaboration';

export default function ForkButton({ moleculeId, compact = false }) {
  const collaboration = useCollaboration();
  const [done, setDone] = useState(false);
  return <button type="button" disabled={done || collaboration.loading} onClick={async () => { await collaboration.forkMolecule(moleculeId); setDone(true); }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-indigo-400/50 disabled:opacity-60"><GitFork size={15} /> {done ? 'Forked' : compact ? 'Fork' : 'Fork to library'}</button>;
}
