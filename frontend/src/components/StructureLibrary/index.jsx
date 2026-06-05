import { Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useMoleculeStore } from '../../store/moleculeStore';
import { parseMolecule } from '../../utils/api';
import MoleculeCard from './MoleculeCard';

/**
 * Render the saved molecule library.
 * @returns {JSX.Element} Structure library.
 */
export default function StructureLibrary() {
  const navigate = useNavigate();
  const { savedMolecules, removeSavedMolecule, setSmiles, setMolecule, setProperties, setError } = useMoleculeStore();

  const handleLoad = async (record) => {
    try {
      const parsed = record.molecule?.molblock ? record.molecule : await parseMolecule(record.smiles);
      setSmiles(record.smiles);
      setMolecule(parsed);
      setProperties(record.properties || null);
      navigate('/editor');
    } catch (error) {
      setError(error.message);
    }
  };

  if (savedMolecules.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <Database className="mx-auto mb-3 text-indigo-300" size={36} />
        <h2 className="text-lg font-semibold text-white">No saved molecules yet</h2>
        <p className="mt-2 text-sm text-slate-400">Saved molecular designs will be listed here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {savedMolecules.map((record) => (
        <MoleculeCard key={record.id} molecule={record} onLoad={handleLoad} onRemove={removeSavedMolecule} />
      ))}
    </div>
  );
}
