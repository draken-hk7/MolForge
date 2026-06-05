import { Download, GitCompare } from 'lucide-react';
import { useEffect, useState } from 'react';

import Viewer3D from '../components/MoleculeEditor/Viewer3D';
import ResultsViewer from '../components/ResultsViewer';
import { useMoleculeStore } from '../store/moleculeStore';
import { compareProperties, parseMolecule } from '../utils/api';
import { exportToPDF } from '../utils/exportUtils';

/**
 * Render the results and comparison page.
 * @returns {JSX.Element} Results page.
 */
export default function Results() {
  const { currentSmiles, modifiedSmiles, currentProperties, modifiedProperties, setProperties, setModifiedProperties, setError } = useMoleculeStore();
  const [originalMol, setOriginalMol] = useState(null);
  const [modifiedMol, setModifiedMol] = useState(null);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadComparison() {
      if (!currentSmiles) {
        return;
      }
      setLoading(true);
      try {
        const [originalParsed, modifiedParsed] = await Promise.all([
          parseMolecule(currentSmiles),
          modifiedSmiles ? parseMolecule(modifiedSmiles) : Promise.resolve(null)
        ]);
        if (cancelled) {
          return;
        }
        setOriginalMol(originalParsed);
        setModifiedMol(modifiedParsed);
        if (modifiedSmiles && (!currentProperties || !modifiedProperties)) {
          const comparison = await compareProperties(currentSmiles, modifiedSmiles);
          if (!cancelled) {
            setProperties(comparison.original);
            setModifiedProperties(comparison.modified);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadComparison();
    return () => {
      cancelled = true;
    };
  }, [currentProperties, currentSmiles, modifiedProperties, modifiedSmiles, setError, setModifiedProperties, setProperties]);

  const handleExportPdf = async () => {
    try {
      await exportToPDF('results-report', 'molforge-comparison.pdf');
    } catch (error) {
      setError(error.message);
    }
  };

  if (!currentSmiles) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <GitCompare className="mx-auto mb-3 text-indigo-300" size={36} />
        <h1 className="text-xl font-semibold text-white">No comparison loaded</h1>
        <p className="mt-2 text-sm text-slate-400">Molecule comparisons will appear after editor predictions.</p>
      </div>
    );
  }

  return (
    <div id="results-report" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Results</h1>
          <p className="text-sm text-slate-400">{isLoading ? 'Refreshing comparison data' : 'Property comparison dashboard'}</p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          <Download size={16} /> PDF
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Viewer3D molblock={originalMol?.molblock} />
        <Viewer3D molblock={modifiedMol?.molblock || originalMol?.molblock} style="spacefill" />
      </div>
      <ResultsViewer original={currentProperties} modified={modifiedProperties || currentProperties} />
    </div>
  );
}
