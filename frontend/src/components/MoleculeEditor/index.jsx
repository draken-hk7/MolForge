import AtomPicker from './AtomPicker';
import SMILESInput from './SMILESInput';
import Viewer3D from './Viewer3D';
import PropertyPanel from '../PropertyPanel';
import { useMoleculeStore } from '../../store/moleculeStore';

/**
 * Render the main molecule editor wrapper.
 * @param {{selectedAtom: string, onSelectAtom: Function}} props Component props.
 * @returns {JSX.Element} Molecule editor wrapper.
 */
export default function MoleculeEditor({ selectedAtom = 'C', onSelectAtom = () => {} }) {
  const molblock = useMoleculeStore((state) => state.currentMolecule?.molblock);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <SMILESInput />
        <AtomPicker selected={selectedAtom} onSelect={onSelectAtom} />
      </div>
      <Viewer3D molblock={molblock} />
      <PropertyPanel />
    </div>
  );
}
