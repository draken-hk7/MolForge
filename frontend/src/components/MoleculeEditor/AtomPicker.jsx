import * as Tooltip from '@radix-ui/react-tooltip';

import { cn } from '../../utils/classNames';

const elements = [
  ['H', 'Hydrogen'],
  ['He', 'Helium'],
  ['Li', 'Lithium'],
  ['Be', 'Beryllium'],
  ['B', 'Boron'],
  ['C', 'Carbon'],
  ['N', 'Nitrogen'],
  ['O', 'Oxygen'],
  ['F', 'Fluorine'],
  ['Ne', 'Neon'],
  ['Na', 'Sodium'],
  ['Mg', 'Magnesium'],
  ['Al', 'Aluminum'],
  ['Si', 'Silicon'],
  ['P', 'Phosphorus'],
  ['S', 'Sulfur'],
  ['Cl', 'Chlorine'],
  ['Ar', 'Argon'],
  ['K', 'Potassium'],
  ['Ca', 'Calcium'],
  ['Sc', 'Scandium'],
  ['Ti', 'Titanium'],
  ['V', 'Vanadium'],
  ['Cr', 'Chromium'],
  ['Mn', 'Manganese'],
  ['Fe', 'Iron'],
  ['Co', 'Cobalt'],
  ['Ni', 'Nickel'],
  ['Cu', 'Copper'],
  ['Zn', 'Zinc'],
  ['Ga', 'Gallium'],
  ['Ge', 'Germanium'],
  ['As', 'Arsenic'],
  ['Se', 'Selenium'],
  ['Br', 'Bromine'],
  ['Kr', 'Krypton']
];

const commonOrganic = new Set(['H', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I']);

/**
 * Render a compact atom picker for atom substitution.
 * @param {{selected: string, onSelect: Function}} props Component props.
 * @returns {JSX.Element} Atom picker.
 */
export default function AtomPicker({ selected = 'C', onSelect }) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Atom Picker</h2>
          <p className="text-xs text-slate-400">First 36 elements</p>
        </div>
        <span className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-2 py-1 font-mono text-sm font-semibold text-indigo-100">{selected}</span>
      </div>
      <Tooltip.Provider delayDuration={120}>
        <div className="grid grid-cols-6 gap-1.5">
          {elements.map(([symbol, name], index) => (
            <Tooltip.Root key={symbol}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(symbol)}
                  className={cn(
                    'aspect-square rounded-lg border font-mono text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400',
                    selected === symbol && 'border-indigo-300 bg-indigo-500 text-white',
                    selected !== symbol && commonOrganic.has(symbol) && 'border-indigo-400/25 bg-indigo-500/12 text-indigo-100 hover:bg-indigo-500/20',
                    selected !== symbol && !commonOrganic.has(symbol) && 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10'
                  )}
                >
                  {symbol}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="rounded-lg border border-white/10 bg-[#12121a] px-2 py-1 text-xs text-slate-200 shadow-xl" sideOffset={6}>
                  {index + 1}. {name}
                  <Tooltip.Arrow className="fill-[#12121a]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ))}
        </div>
      </Tooltip.Provider>
    </section>
  );
}
