import { Atom, Eye, GitFork } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import CommentThread from '../components/Collaboration/CommentThread';
import ForkButton from '../components/Collaboration/ForkButton';
import Viewer3D from '../components/MoleculeEditor/Viewer3D';
import { getSharedMolecule } from '../utils/api';

export default function SharedMolecule() {
  const { token } = useParams();
  const [molecule, setMolecule] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getSharedMolecule(token).then(setMolecule).catch((nextError) => setError(nextError.message)); }, [token]);
  if (error) return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>;
  if (!molecule) return <div className="py-16 text-center text-sm text-slate-400">Loading shared molecule...</div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold text-white">{molecule.name}</h1><p className="font-mono text-sm text-indigo-200">{molecule.smiles}</p></div><div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 text-xs text-slate-400"><Eye size={14} /> {molecule.view_count || 0}</span><span className="inline-flex items-center gap-1 text-xs text-slate-400"><GitFork size={14} /> {molecule.fork_count || 0}</span><ForkButton moleculeId={molecule.id} /></div></div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"><Viewer3D molblock={molecule.mol_data?.molblock} /><div className="space-y-4"><section className="glass-panel rounded-lg p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Atom size={16} /> Properties</h2><div className="grid grid-cols-2 gap-2">{Object.entries(molecule.properties || {}).map(([key, value]) => <div key={key} className="rounded-md bg-black/20 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">{key.replaceAll('_', ' ')}</div><div className="text-sm font-semibold text-slate-200">{value?.value ?? value} {value?.unit || ''}</div></div>)}</div></section><CommentThread moleculeId={molecule.id} /></div></div>
    </div>
  );
}
