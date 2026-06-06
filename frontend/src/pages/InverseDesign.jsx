import { CheckCircle2, Cpu, FlaskConical, Target } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TargetPropertyForm from '../components/SimulationControls/TargetPropertyForm';
import { useMoleculeStore } from '../store/moleculeStore';
import { parseMolecule } from '../utils/api';
import { formatNumber, formatPercent, formatPropertyValue, PROPERTY_DEFINITIONS } from '../utils/propertyFormatters';

const processSteps = [
  { label: 'Target', icon: Target },
  { label: 'Search', icon: Cpu },
  { label: 'Score', icon: FlaskConical },
  { label: 'Load', icon: CheckCircle2 }
];

/**
 * Render inverse design page.
 * @returns {JSX.Element} Inverse design page.
 */
export default function InverseDesign() {
  const navigate = useNavigate();
  const { setSmiles, setMolecule, setProperties, setError } = useMoleculeStore();
  const [results, setResults] = useState([]);

  const handleSelectCandidate = async (candidate) => {
    try {
      const parsed = await parseMolecule(candidate.smiles);
      setSmiles(parsed.smiles);
      setMolecule(parsed);
      setProperties(null);
      navigate('/editor');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Inverse Design</h1>
        <p className="mt-1 text-sm text-slate-400">Target properties to candidate molecular structures</p>
      </div>

      <section className="glass-panel rounded-2xl p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {processSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-500/15 text-indigo-200">
                  <Icon size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{step.label}</div>
                  <div className="text-xs text-slate-500">Step {index + 1}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <TargetPropertyForm onResults={setResults} onSelectCandidate={handleSelectCandidate} showResults={false} />
        <section className="glass-panel rounded-2xl p-4">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-white">Candidates</h2>
            <p className="text-xs text-slate-400">Ranked by normalized distance from target</p>
          </div>
          {results.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {results.map((candidate, index) => {
                const definition = PROPERTY_DEFINITIONS[candidate.target_property];
                return (
                  <button
                    key={`${candidate.smiles}-${index}`}
                    type="button"
                    onClick={() => handleSelectCandidate(candidate)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">Rank {index + 1}</span>
                      <span className="rounded-md bg-black/25 px-2 py-1 text-xs text-slate-300">score {formatPercent(Number(candidate.score) * 100, 1)}</span>
                    </div>
                    <p className="mt-3 truncate font-mono text-xs text-indigo-200" title={candidate.smiles}>{candidate.smiles}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-black/20 p-2">
                        <div className="text-slate-500">{definition.label}</div>
                        <div className="font-mono text-white">
                          {formatPropertyValue(candidate.target_property, candidate.predicted_value)} {definition.unit}
                        </div>
                      </div>
                      <div className="rounded-lg bg-black/20 p-2">
                        <div className="text-slate-500">MolWt</div>
                        <div className="font-mono text-white">{formatNumber(candidate.descriptors.MolWt, 3)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-slate-400">
              <Target className="mx-auto mb-3 text-indigo-300" size={32} />
              <div className="font-medium text-slate-300">No candidates yet</div>
              <p className="mt-1 text-sm text-slate-400">Candidate molecules will appear after a target search.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
