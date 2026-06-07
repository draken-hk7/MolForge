import { Camera, Loader2, Maximize2, Minimize2, Pause, RotateCcw, RotateCw, ScanLine, X } from 'lucide-react';
import * as NGL from 'ngl';
import { useEffect, useRef, useState } from 'react';

import { useFullscreen } from '../../hooks/useFullscreen';
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

const methodBadges = {
  rcsb_experimental: {
    label: 'Experimentally Verified',
    className: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
    title: 'Structure from RCSB PDB experimental X-ray or Cryo-EM data'
  },
  esmfold: {
    label: 'AI Predicted (ESMFold)',
    className: 'border-teal-400/30 bg-teal-500/10 text-teal-200',
    title: 'AI-predicted protein structure from ESMFold'
  },
  unavailable: {
    label: 'Structure Unavailable',
    className: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
    title: 'Sequence analysis is available while structure services reconnect'
  }
};

export default function ProteinViewer3D({ pdbString, method = '', onRetry }) {
  const fullscreenRef = useRef(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const componentRef = useRef(null);
  const [representation, setRepresentation] = useState('cartoon');
  const [colorScheme, setColorScheme] = useState('structure');
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState('');
  const [error, setError] = useState('');
  const [retrySeconds, setRetrySeconds] = useState(30);
  const { isFullscreen, exitFullscreen, toggleFullscreen } = useFullscreen(fullscreenRef);
  const unavailable = method === 'unavailable';
  const methodBadge = methodBadges[method];

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
    const timer = window.setTimeout(() => stageRef.current?.handleResize(), 80);
    return () => window.clearTimeout(timer);
  }, [isFullscreen]);

  useEffect(() => {
    setRepresentation('cartoon');
  }, [method]);

  useEffect(() => {
    if (!unavailable || !onRetry) {
      setRetrySeconds(30);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setRetrySeconds((seconds) => {
        if (seconds <= 1) {
          onRetry();
          return 30;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onRetry, unavailable]);

  const takeScreenshot = async () => {
    const blob = await stageRef.current?.makeImage({ factor: 2, antialias: true, trim: true });
    if (!blob) {
      return;
    }
    NGL.download(blob, 'molforge-protein.png');
  };

  return (
    <section
      ref={fullscreenRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          toggleFullscreen();
        }
      }}
      className={cn('glass-panel overflow-hidden rounded-2xl bg-[#0a0a0f] outline-none', isFullscreen && 'flex h-screen w-screen flex-col rounded-none')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-lg font-medium text-white">Protein Structure</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-400">{hover || `${method === 'rcsb_experimental' ? 'Experimental PDB' : method === 'esmfold' ? 'ESMFold prediction' : unavailable ? 'Waiting for structure service' : 'No structure loaded'} - NGL Viewer`}</p>
            {methodBadge && <span title={methodBadge.title} className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${methodBadge.className}`}>{methodBadge.label}</span>}
          </div>
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
          <button
            type="button"
            onClick={toggleFullscreen}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:border-teal-400/50"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {isFullscreen && (
            <button
              type="button"
              onClick={exitFullscreen}
              className="grid h-9 w-9 place-items-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-200"
              title="Exit fullscreen"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {pdbString && <div className="grid gap-2 border-b border-white/10 bg-black/15 px-4 py-3 lg:grid-cols-2">
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
      </div>}
      <div className={cn('relative h-[450px] min-h-[360px] bg-[#0a0a0f]', isFullscreen && 'min-h-0 flex-1')}>
        <div ref={containerRef} className="absolute inset-0" />
        {!pdbString && !unavailable && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <ScanLine className="mx-auto mb-3 text-teal-300" size={32} />
              <div className="font-medium text-slate-300">No structure loaded</div>
              <p className="mt-1 text-sm text-slate-400">Predict a sequence or load a UniProt structure.</p>
            </div>
          </div>
        )}
        {unavailable && (
          <div className="absolute inset-0 grid place-items-center bg-[#0a0a0f] px-6 text-center">
            <div className="w-full max-w-md rounded-lg border border-teal-400/30 bg-teal-500/[0.06] p-6">
              <Loader2 className="mx-auto animate-spin text-teal-300" size={34} />
              <h3 className="mt-4 text-lg font-semibold text-white">Connecting to structure prediction service...</h3>
              <p className="mt-2 text-sm text-slate-400">While waiting, sequence analysis is available in the panel below.</p>
              <button
                type="button"
                onClick={() => {
                  setRetrySeconds(30);
                  onRetry?.();
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-teal-400/30 bg-teal-500/15 px-4 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-500/25"
              >
                <RotateCcw size={16} /> Retry
              </button>
              <p className="mt-3 text-xs text-slate-500">Retrying in {retrySeconds}s...</p>
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
