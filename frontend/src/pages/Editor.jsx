import { Download, GitCompare, History, Save, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AtomPicker from '../components/MoleculeEditor/AtomPicker';
import SMILESInput from '../components/MoleculeEditor/SMILESInput';
import Viewer3D from '../components/MoleculeEditor/Viewer3D';
import PropertyPanel from '../components/PropertyPanel';
import HistoryLog from '../components/ResultsViewer/HistoryLog';
import SimulationControls from '../components/SimulationControls';
import { useMolecule } from '../hooks/useMolecule';
import { useProperties } from '../hooks/useProperties';
import { useMoleculeStore } from '../store/moleculeStore';
import { exportToJSON, exportToSDF } from '../utils/exportUtils';

const groups = ['OH', 'NH2', 'COOH', 'CH3', 'F', 'Cl', 'Br'];

/**
 * Render the molecule editor page.
 * @returns {JSX.Element} Editor page.
 */
export default function Editor() {
  const navigate = useNavigate();
  const { currentMolecule, currentSmiles, currentProperties, modifiedSmiles, modifiedProperties, saveMolecule, setError } = useMoleculeStore();
  const { mutate, addGroup } = useMolecule();
  const { predictActiveProperties } = useProperties();
  const [selectedAtom, setSelectedAtom] = useState('C');
  const [atomIndex, setAtomIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const activeSmiles = modifiedSmiles || currentSmiles;
  const activeProperties = modifiedProperties || currentProperties;

  const handleSave = () => {
    if (!activeSmiles) {
      setError('Load a molecule before saving.');
      return;
    }
    const name = window.prompt('Name this molecule', activeSmiles) || activeSmiles;
    saveMolecule({
      name,
      smiles: activeSmiles,
      molecule: currentMolecule,
      properties: activeProperties
    });
  };

  const handleExportJson = () => {
    try {
      exportToJSON(currentMolecule, activeProperties);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleExportSdf = () => {
    try {
      exportToSDF(currentMolecule?.molblock);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCompare = async () => {
    await predictActiveProperties();
    navigate('/results');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Molecule Editor</h1>
          <p className="mt-1 max-w-[min(72vw,48rem)] truncate font-mono text-sm text-indigo-200" title={activeSmiles || 'No molecule loaded'}>
            {activeSmiles || 'No molecule loaded'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:border-indigo-400/50">
            <Save size={16} /> Save
          </button>
          <button type="button" onClick={handleExportJson} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:border-indigo-400/50">
            <Download size={16} /> JSON
          </button>
          <button type="button" onClick={handleExportSdf} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:border-indigo-400/50">
            <Download size={16} /> SDF
          </button>
          <button type="button" onClick={handleCompare} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400">
            <GitCompare size={16} /> Compare
          </button>
          <button type="button" onClick={() => setShowHistory((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-100 transition hover:border-indigo-400/50" title="History">
            <History size={16} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <SMILESInput />
          <AtomPicker selected={selectedAtom} onSelect={setSelectedAtom} />
          <section className="glass-panel rounded-2xl p-4">
            <div className="mb-3">
              <h2 className="text-lg font-medium text-white">Modify</h2>
              <p className="text-xs text-slate-400">Atom swap and functional group edits</p>
            </div>
            <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                min="0"
                value={atomIndex}
                onChange={(event) => setAtomIndex(event.target.value)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-indigo-100 outline-none focus:border-indigo-400/60"
              />
              <button
                type="button"
                onClick={() => mutate(atomIndex, selectedAtom)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                <Wand2 size={16} /> Swap
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {groups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => addGroup(group)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 font-mono text-sm font-semibold text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
                >
                  {group}
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="space-y-4">
          <Viewer3D molblock={currentMolecule?.molblock} />
          <SimulationControls />
        </div>
        <div className="space-y-4 xl:col-span-2 2xl:col-span-1">
          <PropertyPanel />
          {showHistory && <HistoryLog />}
        </div>
      </div>
    </div>
  );
}
