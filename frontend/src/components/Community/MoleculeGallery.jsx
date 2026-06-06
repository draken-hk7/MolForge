import { Atom } from 'lucide-react';

import MoleculePublicCard from './MoleculePublicCard';

export default function MoleculeGallery({ molecules }) {
  if (!molecules.length) return <div className="glass-panel rounded-lg p-10 text-center"><Atom className="mx-auto mb-3 text-indigo-300" /><p className="text-sm text-slate-400">No public molecules match this view.</p></div>;
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{molecules.map((molecule) => <MoleculePublicCard key={molecule.id} molecule={molecule} />)}</div>;
}
