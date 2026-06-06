import { Camera, Loader2, Pause, RotateCw, ScanLine } from 'lucide-react';
import * as NGL from 'ngl';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../../utils/classNames';

const representations = [
  { key: 'cartoon', label: 'Cartoon' },
  { key: 'surface', label: 'Surface' },
  { key: 'ball+stick', label: 'Ball + stick' },
  { key: 'licorice', label: 'Licorice' }
];

const colorSchemes = [
  { key: 'structure', label: 'Structure' },
  { key: 'bfactor', label: 'pLDDT / B-factor' },
  { key: 'residue', label: 'Residue' }
];

let schemesRegistered = false;
let structureScheme = 'sstruc';
let confidenceScheme = 'bfactor';

function registerColorSchemes() {
  if (schemesRegistered) {
    return;
  }
  structureScheme = NGL.ColormakerRegistry.addScheme(function secondaryStructureScheme() {
    this.atomColor = (atom) => {
      if (['h', 'g', 'i'].includes(atom.sstruc)) {
        return 0xef4444;
      }
      if (['e', 'b'].includes(atom.sstruc)) {
        return 0xeab308;
      }
      return 0x6b7280;
    };
  }, 'molforge-structure');
  confidenceScheme = NGL.ColormakerRegistry.addScheme(function proteinConfidenceScheme() {
    this.atomColor = (atom) => {
      if (atom.bfactor > 90) {
        return 0x3b82f6;
      }
      if (atom.bfactor >= 70) {
        return 0x22c55e;
      }
      if (atom.bfactor >= 50) {
        return 0xeab308;
      }
      return 0xf97316;
    };
  }, 'molforge-plddt');
  schemesRegistered = true;
}

function nglColorScheme(mode) {
  if (mode === 'structure') {
    return structureScheme;
  }
  if (mode === 'bfactor') {
    return confidenceScheme;
  }
  return 'resname';
}

export default function ProteinViewer3D({ pdbString, method = 'mock' }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const componentRef = useRef(null);
  const [representation, setRepresentation] = useState(method === 'mock' ? 'ball+stick' : 'cartoon');
  const [colorScheme, setColorScheme] = useState('structure');
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    registerColorSchemes();
    const container = containerRef.current;
    const stage = new NGL.Stage(container, { backgroundColor: '#0a0a0f', tooltip: false });
    stageRef.current = stage;
    const handleResize = () => stage.handleResize();
    window.addEventListener('resize', handleResize);
    stage.signals.hovered.add((pickingProxy) => {
      const atom = pickingProxy?.atom;
      setHover(atom ? `${atom.resname} ${atom.chainname || atom.chainid || ''}${atom.resno}` : '');
    });
    return () => {
      window.removeEventListener('resize', handleResize);
      stage.dispose();
      container?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    stage.removeAllComponents();
    componentRef.current = null;
    setError('');
    if (!pdbString) {
      return;
    }
    setLoading(true);
    stage
      .loadFile(new Blob([pdbString], { type: 'text/plain' }), { ext: 'pdb' })
      .then((component) => {
        componentRef.current = component;
        component.addRepresentation(representation, {
          colorScheme: nglColorScheme(colorScheme),
          quality: 'high',
          surfaceType: 'av'
        });
        component.autoView();
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [colorScheme, pdbString, representation]);

  useEffect(() => {
    stageRef.current?.setSpin(spinning);
  }, [spinning]);

  useEffect(() => {
    setRepresentation(method === 'mock' ? 'ball+stick' : 'cartoon');
  }, [method]);

  const takeScreenshot = async () => {
    const blob = await stageRef.current?.makeImage({ factor: 2, antialias: true, trim: true });
    if (!blob) {
      return;
    }
    NGL.download(blob, 'molforge-protein.png');
  };

  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-lg font-medium text-white">Protein Structure</h2>
          <p className="text-xs text-slate-400">{hover || `${method === 'rcsb' ? 'Experimental PDB' : method === 'esmfold' ? 'ESMFold prediction' : 'Mock peptide fallback'} - NGL Viewer`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => stageRef.current?.autoView()}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:border-teal-400/50"
            title="Fit structure"
          >
            <ScanLine size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSpinning((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:border-teal-400/50"
            title={spinning ? 'Pause rotation' : 'Spin structure'}
          >
            {spinning ? <Pause size={16} /> : <RotateCw size={16} />}
          </button>
          <button
            type="button"
            onClick={takeScreenshot}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:border-teal-400/50"
            title="Screenshot"
          >
            <Camera size={16} />
          </button>
        </div>
      </div>
      <div className="grid gap-2 border-b border-white/10 bg-black/15 px-4 py-3 lg:grid-cols-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
          {colorSchemes.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setColorScheme(option.key)}
              className={cn('flex-1 rounded-md px-2 py-1.5 text-xs font-semibold', colorScheme === option.key ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white')}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
          {representations.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRepresentation(option.key)}
              className={cn('flex-1 rounded-md px-2 py-1.5 text-xs font-semibold', representation === option.key ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[450px] min-h-[360px] bg-[#0a0a0f]">
        <div ref={containerRef} className="absolute inset-0" />
        {!pdbString && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <ScanLine className="mx-auto mb-3 text-teal-300" size={32} />
              <div className="font-medium text-slate-300">No structure loaded</div>
              <p className="mt-1 text-sm text-slate-400">Predict a sequence or load a UniProt structure.</p>
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-[#0a0a0f]/80">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        )}
        {error && <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
      </div>
    </section>
  );
}
