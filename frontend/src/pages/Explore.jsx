import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import MoleculeGallery from '../components/Community/MoleculeGallery';
import { getPublicMolecules } from '../utils/api';

export default function Explore() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [tag, setTag] = useState('');
  const [data, setData] = useState({ items: [], total: 0 });

  useEffect(() => {
    const timer = window.setTimeout(() => getPublicMolecules({ search: query, sort, tag }).then(setData).catch(() => setData({ items: [], total: 0 })), 200);
    return () => window.clearTimeout(timer);
  }, [query, sort, tag]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-white">Explore molecules</h1><p className="text-sm text-slate-400">{data.total} public research structures</p></div><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-white/10 bg-[#15151f] px-3 py-2 text-sm text-slate-200"><option value="newest">Newest</option><option value="most_forked">Most forked</option><option value="most_viewed">Most viewed</option></select></div>
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="glass-panel h-fit rounded-lg p-4"><label className="text-xs font-semibold uppercase text-slate-500">Tag filter</label><input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="battery, polymer..." className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60" /></aside>
        <div className="space-y-4"><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-500" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SMILES, or tag" className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-indigo-400/60" /></div><MoleculeGallery molecules={data.items || []} /></div>
      </div>
    </div>
  );
}
