import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';

import { runInverseDesign } from '../../utils/api';
import { PROPERTY_DEFINITIONS, formatPercent, formatPropertyValue } from '../../utils/propertyFormatters';

const targetOptions = ['bandgap_ev', 'melting_point_k', 'hardness_gpa', 'solubility_logS'];

/**
 * Render the inverse-design target form and optional results list.
 * @param {{onResults?: Function, onSelectCandidate?: Function, showResults?: boolean}} props Component props.
 * @returns {JSX.Element} Target property form.
 */
export default function TargetPropertyForm({ onResults, onSelectCandidate, showResults = true }) {
  const [targetProperty, setTargetProperty] = useState('bandgap_ev');
  const [targetValue, setTargetValue] = useState(3);
  const [candidateCount, setCandidateCount] = useState(5);
  const [results, setResults] = useState([]);
  const [isRunning, setRunning] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setRunning(true);
    setError('');
    try {
      const response = await runInverseDesign(targetProperty, Number(targetValue), Number(candidateCount));
      setResults(response.candidates);
      onResults?.(response.candidates);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-white">Target Property</h2>
          <p className="text-xs text-slate-400">Search molecules against local predictors</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Property</span>
          <select
            value={targetProperty}
            onChange={(event) => setTargetProperty(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#12121a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400/60"
          >
            {targetOptions.map((key) => (
              <option key={key} value={key}>
                {PROPERTY_DEFINITIONS[key].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Target value</span>
          <input
            type="number"
            step="0.01"
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-indigo-100 outline-none focus:border-indigo-400/60"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Candidates</span>
            <span>{candidateCount}</span>
          </span>
          <input
            type="range"
            min="1"
            max="10"
            value={candidateCount}
            onChange={(event) => setCandidateCount(event.target.value)}
            className="w-full accent-indigo-500"
          />
        </label>
        <button
          type="submit"
          disabled={isRunning}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Search size={16} />}
          Find Molecules
        </button>
      </form>

      {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      {showResults && results.length > 0 && (
        <div className="mt-5 space-y-3">
          {results.map((candidate, index) => (
            <button
              key={`${candidate.smiles}-${index}`}
              type="button"
              onClick={() => onSelectCandidate?.(candidate)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">Rank {index + 1}</span>
                <span className="rounded-md bg-black/25 px-2 py-1 text-xs text-slate-300">score {formatPercent(Number(candidate.score) * 100, 1)}</span>
              </div>
              <p className="mt-2 truncate font-mono text-xs text-indigo-200" title={candidate.smiles}>{candidate.smiles}</p>
              <p className="mt-2 text-xs text-slate-400">
                {PROPERTY_DEFINITIONS[targetProperty].label}: {formatPropertyValue(targetProperty, candidate.predicted_value)}{' '}
                {PROPERTY_DEFINITIONS[targetProperty].unit}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
