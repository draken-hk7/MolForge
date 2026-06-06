import { ExternalLink, FlaskConical, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMoleculeStore } from '../../store/moleculeStore';
import { parseMolecule, searchProteinLigands } from '../../utils/api';
import { formatNumber } from '../../utils/propertyFormatters';

export default function ProteinLigandSearch({ protein }) {
  const navigate = useNavigate();
  const { setSmiles, setMolecule, setError } = useMoleculeStore();
  const [query, setQuery] = useState(protein?.known_ligands?.[0] || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setLocalError] = useState('');

  if (!protein) {
    return null;
  }

  const handleSearch = async () => {
    setLoading(true);
    setLocalError('');
    try {
      setResults(await searchProteinLigands(query));
    } catch (searchError) {
      setLocalError(searchError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (ligand) => {
    try {
      const parsed = await parseMolecule(ligand.smiles);
      setSmiles(parsed.smiles);
      setMolecule(parsed);
      navigate('/editor');
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-white">Protein to Small Molecule</h2>
        <p className="text-xs text-slate-400">Search PubChem and load ligand candidates into the molecule editor</p>
      </div>
      {protein.known_ligands?.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {protein.known_ligands.map((ligand) => (
            <button key={ligand} type="button" onClick={() => setQuery(ligand)} className="rounded-md border border-teal-400/25 bg-teal-500/10 px-2 py-1 text-xs text-teal-100">{ligand}</button>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400/60" placeholder="Ligand or cofactor name" />
        <button type="button" onClick={handleSearch} disabled={!query.trim() || loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-teal-400/50 disabled:opacity-40">
          {loading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Search size={16} />} Search
        </button>
      </div>
      {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((ligand) => (
            <div key={ligand.cid} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><div className="truncate text-sm font-medium text-white" title={ligand.name}>{ligand.name}</div><div className="text-xs text-slate-400">CID {ligand.cid} - {ligand.molecular_formula} - {formatNumber(ligand.molecular_weight, 3)} Da</div></div>
                <a href={`https://pubchem.ncbi.nlm.nih.gov/compound/${ligand.cid}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-slate-300 hover:text-white" title="Open PubChem"><ExternalLink size={14} /></a>
              </div>
              <div className="mt-2 truncate font-mono text-xs text-indigo-200" title={ligand.smiles}>{ligand.smiles || 'n/a'}</div>
              {ligand.related_materials?.length > 0 && (
                <div className="mt-2 text-xs text-blue-200">
                  Same-formula Materials Project records: {ligand.related_materials.map((material) => material.material_id).join(', ')}
                </div>
              )}
              <button type="button" onClick={() => handleLoad(ligand)} disabled={!ligand.smiles} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-40"><FlaskConical size={14} /> Load into Molecule Editor</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
