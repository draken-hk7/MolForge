import { ChevronDown, Dna, Download, ShieldCheck } from 'lucide-react';

import ProteinCompare from '../components/Protein/ProteinCompare';
import ProteinLigandSearch from '../components/Protein/ProteinLigandSearch';
import ProteinPropertyPanel from '../components/Protein/ProteinPropertyPanel';
import ProteinSequenceInput from '../components/Protein/ProteinSequenceInput';
import ProteinViewer3D from '../components/Protein/ProteinViewer3D';
import SecondaryStructureBar from '../components/Protein/SecondaryStructureBar';
import { useProtein } from '../hooks/useProtein';

export default function ProteinFolding() {
  const {
    proteinStatus,
    currentProtein,
    currentSequence,
    currentStructure,
    proteinProperties,
    uniprotResults,
    selectedUniprotEntry,
    isLoading,
    error,
    predictStructure,
    searchUniprot,
    getStructureById
  } = useProtein();

  const exportPdb = () => {
    if (!currentStructure?.pdb_string) {
      return;
    }
    const blob = new Blob([currentStructure.pdb_string], { type: 'chemical/x-pdb' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedUniprotEntry?.uniprot_id || 'molforge-protein'}.pdb`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const secondary = currentStructure?.analysis?.secondary_structure_summary || proteinProperties?.secondary_structure_fraction;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white"><Dna size={24} className="text-teal-300" /> Protein Structure Prediction</h1>
          <p className="mt-1 text-sm text-slate-400">Sequence analysis, UniProt retrieval, and interactive NGL protein visualization</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-teal-400/25 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-100">
            <span className={`h-2.5 w-2.5 rounded-full ${proteinStatus.esmfold_available ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {proteinStatus.esmfold_available ? 'ESMFold Ready' : 'ESMFold Fallback'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"><ShieldCheck size={14} /> {proteinStatus.uniprot_available ? 'UniProt Available' : 'Manual Input'}</span>
          <button type="button" onClick={exportPdb} disabled={!currentStructure?.pdb_string} className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-40"><Download size={16} /> PDB</button>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(360px,40%)_minmax(0,60%)]">
        <div className="space-y-4">
          <ProteinSequenceInput
            currentSequence={currentSequence}
            isLoading={isLoading}
            error={error}
            uniprotResults={uniprotResults}
            uniprotAvailable={proteinStatus.uniprot_available}
            onPredict={predictStructure}
            onSearchUniprot={searchUniprot}
            onLoadUniprot={getStructureById}
          />
          <ProteinPropertyPanel properties={proteinProperties} analysis={currentStructure?.analysis} method={currentStructure?.method} />
          <ProteinLigandSearch protein={selectedUniprotEntry || currentProtein} />
        </div>
        <div className="space-y-4">
          <ProteinViewer3D
            pdbString={currentStructure?.pdb_string}
            method={currentStructure?.method}
            onRetry={currentSequence ? () => predictStructure(currentSequence) : undefined}
          />
          {secondary && (
            <section className="glass-panel rounded-2xl p-4">
              <h2 className="mb-3 text-lg font-medium text-white">Secondary Structure</h2>
              <SecondaryStructureBar secondary={secondary} />
            </section>
          )}
          {currentStructure?.warning && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{currentStructure.warning}</div>}
        </div>
      </div>

      <details className="glass-panel group rounded-2xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-lg font-medium text-white">
          Compare Protein Structures
          <ChevronDown size={18} className="transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-white/10 p-4"><ProteinCompare initialSequence={currentSequence} /></div>
      </details>
    </div>
  );
}
