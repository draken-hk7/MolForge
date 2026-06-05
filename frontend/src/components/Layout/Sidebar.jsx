import { BarChart3, Database, FlaskConical, History, LayoutDashboard, PencilRuler } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useMoleculeStore } from '../../store/moleculeStore';
import { cn } from '../../utils/classNames';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/editor', label: 'Editor', icon: PencilRuler },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/library', label: 'Library', icon: Database },
  { to: '/inverse-design', label: 'Design', icon: FlaskConical }
];

/**
 * Render the responsive application sidebar.
 * @returns {JSX.Element} Sidebar component.
 */
export default function Sidebar() {
  const { sessionHistory, savedMolecules } = useMoleculeStore();

  return (
    <aside className="border-b border-white/10 bg-[#0d0d14]/85 px-3 py-3 backdrop-blur-xl lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:px-4">
      <nav className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto lg:mx-0 lg:block lg:space-y-2 lg:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'inline-flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition lg:w-full',
                  isActive ? 'bg-indigo-500/18 text-white ring-1 ring-indigo-400/30' : 'hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-6 hidden space-y-3 lg:block">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <History size={14} /> Session
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-black/20 p-2">
              <div className="text-lg font-bold text-white">{sessionHistory.length}</div>
              <div className="text-[11px] text-slate-500">Analyzed</div>
            </div>
            <div className="rounded-md bg-black/20 p-2">
              <div className="text-lg font-bold text-white">{savedMolecules.length}</div>
              <div className="text-[11px] text-slate-500">Saved</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
