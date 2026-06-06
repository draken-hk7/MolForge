import { Clipboard, Eraser, Loader2, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useMolecule } from '../../hooks/useMolecule';
import { cn } from '../../utils/classNames';
import { validateSmilesPattern } from '../../utils/smilesUtils';

/**
 * Render the SMILES input and sample loader.
 * @returns {JSX.Element} SMILES input component.
 */
export default function SMILESInput() {
  const { currentSmiles, error, isLoading, parse, loadSamples, setError } = useMolecule();
  const [smiles, setSmiles] = useState(currentSmiles || 'CCO');
  const [samples, setSamples] = useState([]);
  const validation = useMemo(() => validateSmilesPattern(smiles), [smiles]);

  useEffect(() => {
    loadSamples()
      .then(setSamples)
      .catch((err) => setError(err.message));
  }, [loadSamples, setError]);

  useEffect(() => {
    if (currentSmiles) {
      setSmiles(currentSmiles);
    }
  }, [currentSmiles]);

  const handleParse = async () => {
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    await parse(smiles);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setSmiles(text.trim());
  };

  const handleSample = async (event) => {
    const sample = samples.find((item) => item.name === event.target.value);
    if (sample) {
      setSmiles(sample.smiles);
      await parse(sample.smiles, { name: sample.name });
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">SMILES</h2>
          <p className="text-xs text-slate-400">Canonical input for the active molecule</p>
        </div>
        <span className={cn('h-3 w-3 rounded-full', validation.valid ? 'bg-emerald-400' : 'bg-red-400')} title={validation.message} />
      </div>

      <textarea
        value={smiles}
        onChange={(event) => setSmiles(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleParse();
          }
        }}
        rows={4}
        className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-3 font-mono text-sm text-indigo-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-400/60"
        placeholder="CC(=O)Oc1ccccc1C(=O)O"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <select
          onChange={handleSample}
          defaultValue=""
          className="min-w-0 rounded-lg border border-white/10 bg-[#12121a] px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-400/60"
        >
          <option value="" disabled>
            Load sample
          </option>
          {samples.map((sample) => (
            <option key={sample.name} value={sample.name}>
              {sample.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handlePaste}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
        >
          <Clipboard size={16} /> Paste
        </button>
        <button
          type="button"
          onClick={() => setSmiles('')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
        >
          <Eraser size={16} /> Clear
        </button>
        <button
          type="button"
          onClick={handleParse}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Play size={16} />}
          Parse
        </button>
      </div>

      {(error || !validation.valid) && (
        <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error || validation.message}</p>
      )}
    </section>
  );
}
