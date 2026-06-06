import { Camera, Pause, RotateCw, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '../../utils/classNames';

const styleOptions = ['ball-stick', 'spacefill', 'wireframe'];

/**
 * Load the 3Dmol.js script once.
 * @returns {Promise<object>} Window 3Dmol object.
 */
function load3Dmol() {
  if (window.$3Dmol) {
    return Promise.resolve(window.$3Dmol);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-molforge3dmol]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.$3Dmol));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.4/3Dmol-min.js';
    script.async = true;
    script.dataset.molforge3dmol = 'true';
    script.addEventListener('load', () => resolve(window.$3Dmol));
    script.addEventListener('error', () => reject(new Error('3Dmol.js could not be loaded.')));
    document.head.appendChild(script);
  });
}

/**
 * Convert a display style option to 3Dmol style config.
 * @param {string} mode Viewer style mode.
 * @returns {object} 3Dmol style config.
 */
function styleConfig(mode) {
  if (mode === 'spacefill') {
    return { sphere: { scale: 0.85 } };
  }
  if (mode === 'wireframe') {
    return { line: { linewidth: 2, colorscheme: 'Jmol' } };
  }
  return { stick: { radius: 0.16, colorscheme: 'Jmol' }, sphere: { scale: 0.28, colorscheme: 'Jmol' } };
}

/**
 * Render an interactive 3D molecule viewer.
 * @param {{molblock: string, style: string}} props Component props.
 * @returns {JSX.Element} 3D viewer.
 */
export default function Viewer3D({ molblock, style = 'ball-stick' }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [viewStyle, setViewStyle] = useState(style);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hoverAtom, setHoverAtom] = useState(null);
  const [viewerError, setViewerError] = useState('');

  const renderMolecule = useCallback(async () => {
    if (!containerRef.current) {
      return;
    }
    containerRef.current.innerHTML = '';
    viewerRef.current = null;
    if (!molblock) {
      return;
    }
    try {
      const mol3d = await load3Dmol();
      const viewer = mol3d.createViewer(containerRef.current, { backgroundColor: '#0a0a0f' });
      viewer.addModel(molblock, 'mol');
      viewer.setStyle({}, styleConfig(viewStyle));
      viewer.setHoverable(
        {},
        true,
        (atom) => setHoverAtom(atom ? `${atom.elem || atom.element || 'Atom'} #${atom.index ?? atom.serial ?? ''}` : null),
        () => setHoverAtom(null)
      );
      viewer.zoomTo();
      viewer.render();
      viewer.spin(autoRotate);
      viewerRef.current = viewer;
      setViewerError('');
    } catch (error) {
      setViewerError(error.message);
    }
  }, [autoRotate, molblock, viewStyle]);

  useEffect(() => {
    setViewStyle(style);
  }, [style]);

  useEffect(() => {
    renderMolecule();
  }, [renderMolecule]);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.spin(autoRotate);
    }
  }, [autoRotate]);

  const handleStyle = (mode) => {
    setViewStyle(mode);
    if (viewerRef.current) {
      viewerRef.current.setStyle({}, styleConfig(mode));
      viewerRef.current.render();
    }
  };

  const handleScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = 'molforge-viewer.png';
    anchor.click();
  };

  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-lg font-medium text-white">3D Structure</h2>
          <p className="text-xs text-slate-400">{hoverAtom || 'Ball-stick interactive view'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
            {styleOptions.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleStyle(mode)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition',
                  viewStyle === mode ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAutoRotate((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
            title={autoRotate ? 'Pause rotation' : 'Auto rotate'}
          >
            {autoRotate ? <Pause size={16} /> : <RotateCw size={16} />}
          </button>
          <button
            type="button"
            onClick={handleScreenshot}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
            title="Screenshot"
          >
            <Camera size={16} />
          </button>
        </div>
      </div>
      <div className="relative h-[400px] min-h-[320px] w-full bg-[#0a0a0f]">
        <div ref={containerRef} className="absolute inset-0" />
        {!molblock && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div className="max-w-sm">
              <Wand2 className="mx-auto mb-3 text-indigo-300" size={32} />
              <p className="text-sm text-slate-400">A parsed molecule will render here.</p>
            </div>
          </div>
        )}
        {viewerError && (
          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {viewerError}
          </div>
        )}
      </div>
    </section>
  );
}
