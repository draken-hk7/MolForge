import { Dna, Eraser, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '../../utils/classNames';
import { validateProteinSequence } from '../../utils/proteinFormatters';

const samples = [
  { name: 'Insulin A chain', sequence: 'GIVEQCCTSICSLYQLENYCN' },
  {
    name: 'GFP',
    sequence:
      'MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTLTYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK'
  },
  { name: 'Ubiquitin', sequence: 'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG' },
  { name: 'Hemoglobin alpha', sequence: 'MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR' },
  { name: 'Lysozyme', sequence: 'KVFERCELARTLKRLGMDGYRGISLANWMCLAKWESGYNTRATNYNAGDRSTDYGIFQINSRYWCNDGKTPGAVNACHLSCSALLQDNIADAVACAKRVVRDPQGIRAWVAWRNRCQNRDVRQYVQGCGV' },
  { name: 'p53 fragment', sequence: 'MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDI' }
];

export default function ProteinSequenceInput({
  currentSequence,
  isLoading,
  error,
  uniprotResults,
  uniprotAvailable,
  onPredict,
  onSearchUniprot,
  onLoadUniprot
}) {
  const [sequence, setSequence] = useState(currentSequence || samples[2].sequence);
  const [uniprotId, setUniprotId] = useState('P69905');
  const [searchQuery, setSearchQuery] = useState('');
  const validation = useMemo(() => validateProteinSequence(sequence), [sequence]);

  useEffect(() => {
    if (currentSequence) {
      setSequence(currentSequence);
    }
  }, [currentSequence]);

  const handlePredict = () => {
    if (validation.valid) {
      onPredict(validation.sequence);
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Protein Sequence</h2>
          <p className="text-xs text-slate-400">Paste amino acids or FASTA text</p>
        </div>
        <span className={cn('h-3 w-3 rounded-full', validation.valid ? 'bg-emerald-400' : 'bg-red-400')} title={validation.valid ? 'Sequence is valid' : `Invalid: ${validation.invalid.join(', ') || 'empty sequence'}`} />
      </div>

      <textarea
        value={sequence}
        onChange={(event) => setSequence(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            handlePredict();
          }
        }}
        rows={8}
        className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-3 font-mono text-xs leading-5 text-teal-100 outline-none focus:border-teal-400/60"
        placeholder=">protein_name&#10;MQIFVKTLTGKT..."
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className={validation.valid ? 'text-emerald-300' : 'text-red-300'}>{validation.valid ? 'Valid amino acid sequence' : 'Use canonical amino acids only'}</span>
        <span className="text-slate-400">{validation.length} amino acids</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          defaultValue=""
          onChange={(event) => {
            const sample = samples.find((item) => item.name === event.target.value);
            if (sample) {
              setSequence(sample.sequence);
            }
          }}
          className="min-w-0 rounded-lg border border-white/10 bg-[#12121a] px-3 py-2 text-sm text-slate-200"
        >
          <option value="" disabled>Load sample protein</option>
          {samples.map((sample) => <option key={sample.name} value={sample.name}>{sample.name}</option>)}
        </select>
        <button type="button" onClick={() => setSequence('')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-teal-400/50">
          <Eraser size={16} /> Clear
        </button>
      </div>

      <button
        type="button"
        onClick={handlePredict}
        disabled={isLoading || !validation.valid}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Dna size={16} />}
        Predict Structure
      </button>

      {uniprotAvailable && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-2 text-sm font-medium text-white">UniProt</div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input value={uniprotId} onChange={(event) => setUniprotId(event.target.value.toUpperCase())} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-teal-100 outline-none focus:border-teal-400/60" placeholder="P69905" />
            <button type="button" onClick={() => onLoadUniprot(uniprotId.trim())} className="rounded-lg border border-teal-400/30 bg-teal-500/15 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-500/25">
              Load ID
            </button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400/60" placeholder="Search protein name or gene" />
            <button type="button" onClick={() => onSearchUniprot(searchQuery)} disabled={!searchQuery.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-teal-400/50 disabled:opacity-40">
              <Search size={16} /> Search
            </button>
          </div>
          {uniprotResults.length > 0 && (
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {uniprotResults.map((entry) => (
                <button key={entry.uniprot_id} type="button" onClick={() => onLoadUniprot(entry.uniprot_id)} className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left hover:border-teal-400/40 hover:bg-teal-500/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-teal-200">{entry.uniprot_id}</span>
                    {entry.reviewed && <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-200">Swiss-Prot</span>}
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-white" title={entry.protein_name}>{entry.protein_name}</div>
                  <div className="mt-1 text-xs text-slate-400">{entry.organism} - {entry.sequence_length || 'n/a'} aa</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
    </section>
  );
}
