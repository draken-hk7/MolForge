import { GitCompare, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { compareProteinStructures } from '../../utils/api';
import { formatNumber, formatPercent } from '../../utils/propertyFormatters';
import ProteinViewer3D from './ProteinViewer3D';

export default function ProteinCompare({ initialSequence }) {
  const [sequenceA, setSequenceA] = useState(initialSequence || 'GIVEQCCTSICSLYQLENYCN');
  const [sequenceB, setSequenceB] = useState('MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await compareProteinStructures(sequenceA, sequenceB));
    } catch (compareError) {
      setError(compareError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-white">Protein Compare</h2>
        <p className="text-xs text-slate-400">Compare sequence similarity and predicted structures</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <textarea value={sequenceA} onChange={(event) => setSequenceA(event.target.value)} rows={4} className="resize-y rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs text-teal-100 outline-none focus:border-teal-400/60" aria-label="Sequence A" />
        <textarea value={sequenceB} onChange={(event) => setSequenceB(event.target.value)} rows={4} className="resize-y rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs text-teal-100 outline-none focus:border-teal-400/60" aria-label="Sequence B" />
      </div>
      <button type="button" onClick={handleCompare} disabled={loading} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
        {loading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <GitCompare size={16} />} Compare Proteins
      </button>
      {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
      {result && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-teal-400/20 bg-teal-500/10 p-3 text-sm text-teal-100">
            Sequence alignment score: <span className="font-mono font-semibold">{formatPercent(result.sequence_alignment_score, 1)}</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ProteinViewer3D pdbString={result.structure_a.pdb_string} method={result.structure_a.method} />
            <ProteinViewer3D pdbString={result.structure_b.pdb_string} method={result.structure_b.method} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Sequence A</th><th className="px-3 py-2">Sequence B</th></tr></thead>
              <tbody>
                {[
                  ['Length', result.structure_a.properties.sequence_length, result.structure_b.properties.sequence_length],
                  ['Weight (Da)', result.structure_a.properties.molecular_weight, result.structure_b.properties.molecular_weight],
                  ['Isoelectric Point', result.structure_a.properties.isoelectric_point, result.structure_b.properties.isoelectric_point],
                  ['Instability Index', result.structure_a.properties.instability_index, result.structure_b.properties.instability_index]
                ].map(([label, valueA, valueB]) => (
                  <tr key={label} className="border-t border-white/5"><td className="px-3 py-2 text-white">{label}</td><td className="px-3 py-2 font-mono text-slate-300">{formatNumber(valueA, 3)}</td><td className="px-3 py-2 font-mono text-slate-300">{formatNumber(valueB, 3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
