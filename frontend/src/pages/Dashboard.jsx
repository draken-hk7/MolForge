import { Atom, Database, FlaskConical, PencilRuler, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useMoleculeStore } from '../store/moleculeStore';

const quickStarts = [
  { to: '/editor', title: 'Start from SMILES', icon: PencilRuler },
  { to: '/library', title: 'Browse Library', icon: Database },
  { to: '/inverse-design', title: 'Inverse Design', icon: FlaskConical },
  { to: '/editor', title: 'Load Sample', icon: Sparkles }
];

/**
 * Render the dashboard overview page.
 * @returns {JSX.Element} Dashboard page.
 */
export default function Dashboard() {
  const { sessionHistory, savedMolecules } = useMoleculeStore();
  const modifications = sessionHistory.filter((entry) => /Added|Atom/i.test(entry.name)).length;

  return (
    <div className="space-y-6">
      <section className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#111119] p-6 sm:p-8">
        <div className="molecule-field">
          {[0, 1, 2, 3, 4].map((item) => (
            <Atom
              key={item}
              size={90 + item * 18}
              className="animate-float"
              style={{
                left: `${8 + item * 19}%`,
                top: `${12 + (item % 3) * 24}%`,
                animationDelay: `${item * 1.2}s`
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex min-h-[300px] max-w-3xl flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-sm font-medium text-indigo-100">
            <Sparkles size={16} /> Local chemistry workbench
          </span>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-normal text-white sm:text-5xl">
            Design New Materials at the Molecular Level
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Manipulate molecular structures, compare predicted properties, and search candidates for target material behavior.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <NavLink to="/editor" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400">
              <PencilRuler size={17} /> Open Editor
            </NavLink>
            <NavLink to="/inverse-design" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-indigo-400/50">
              <FlaskConical size={17} /> Target Search
            </NavLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-2xl p-4">
          <div className="text-3xl font-bold text-white">{sessionHistory.length}</div>
          <div className="text-sm text-slate-400">Molecules analyzed</div>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <div className="text-3xl font-bold text-white">{modifications}</div>
          <div className="text-sm text-slate-400">Modifications made</div>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <div className="text-3xl font-bold text-white">{savedMolecules.length}</div>
          <div className="text-sm text-slate-400">Saved molecules</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <h2 className="mb-3 text-lg font-medium text-white">Quick Start</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickStarts.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.title}
                  to={item.to}
                  className="glass-panel flex items-center gap-3 rounded-2xl p-4 transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/15 text-indigo-200">
                    <Icon size={20} />
                  </span>
                  <span className="font-semibold text-white">{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium text-white">Recent Session</h2>
          <div className="glass-panel rounded-2xl p-4">
            {sessionHistory.length > 0 ? (
              <ol className="space-y-3">
                {sessionHistory.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="border-l border-indigo-400/40 pl-3">
                    <div className="text-sm font-medium text-white">{entry.name}</div>
                    <div className="truncate font-mono text-xs text-indigo-200" title={entry.smiles}>{entry.smiles}</div>
                    <div className="text-[11px] text-slate-500">{new Date(entry.timestamp).toLocaleString()}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-400">Recent molecule activity will appear here.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
