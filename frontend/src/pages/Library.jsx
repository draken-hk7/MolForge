import StructureLibrary from '../components/StructureLibrary';

/**
 * Render the saved molecule library page.
 * @returns {JSX.Element} Library page.
 */
export default function Library() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Library</h1>
        <p className="mt-1 text-sm text-slate-400">Saved molecular designs and predicted properties</p>
      </div>
      <StructureLibrary />
    </div>
  );
}
