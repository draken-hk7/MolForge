import { Atom, FlaskConical, Github, Server } from 'lucide-react';
import { NavLink } from 'react-router-dom';

/**
 * Render the top navigation bar.
 * @returns {JSX.Element} Navigation component.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-indigo-400/30 bg-indigo-500/15 text-indigo-200">
            <Atom size={22} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-normal text-white">MolForge</span>
            <span className="block text-xs text-slate-400">Molecular Material Designer</span>
          </span>
        </NavLink>
        <div className="hidden items-center gap-2 md:flex">
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <Server size={14} /> Local ML
          </span>
          <a
            href="https://github.com"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:border-indigo-400/50 hover:text-white"
          >
            <Github size={14} /> Source
          </a>
          <NavLink
            to="/inverse-design"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            <FlaskConical size={16} /> Inverse Design
          </NavLink>
        </div>
      </div>
    </header>
  );
}
