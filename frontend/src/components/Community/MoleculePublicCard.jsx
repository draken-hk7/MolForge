import { Atom, Eye, GitFork, Tag } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import ForkButton from '../Collaboration/ForkButton';

export default function MoleculePublicCard({ molecule }) {
  const properties = Object.entries(molecule.properties || {}).slice(0, 2);
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-indigo-400/40">
      <NavLink to={`/m/${molecule.share_token}`} className="mb-3 grid h-28 place-items-center rounded-md bg-black/25 text-indigo-300"><Atom size={54} /></NavLink>
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><NavLink to={`/m/${molecule.share_token}`} className="block truncate font-semibold text-white hover:text-indigo-200">{molecule.name}</NavLink><div className="truncate font-mono text-xs text-indigo-200">{molecule.smiles}</div></div><ForkButton moleculeId={molecule.id} compact /></div>
      <div className="mt-3 grid grid-cols-2 gap-2">{properties.map(([key, value]) => <div key={key} className="rounded-md bg-black/20 px-2 py-2"><div className="truncate text-[10px] uppercase text-slate-500">{key.replaceAll('_', ' ')}</div><div className="truncate text-xs font-semibold text-slate-200">{value?.value ?? value}</div></div>)}</div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><Eye size={12} /> {molecule.view_count || 0}</span><span className="inline-flex items-center gap-1"><GitFork size={12} /> {molecule.fork_count || 0}</span><span className="inline-flex min-w-0 items-center gap-1 truncate"><Tag size={12} /> {(molecule.tags || []).slice(0, 2).join(', ') || 'untagged'}</span></div>
    </article>
  );
}
