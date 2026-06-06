import { formatNumber } from './propertyFormatters';

const MP_PROPERTY_META = {
  band_gap: { label: 'Band Gap', unit: 'eV', precision: 3 },
  formation_energy_per_atom: { label: 'Formation Energy', unit: 'eV/atom', precision: 4 },
  energy_above_hull: { label: 'Energy Above Hull', unit: 'eV/atom', precision: 4 },
  density: { label: 'Density', unit: 'g/cm3', precision: 3 },
  volume: { label: 'Cell Volume', unit: 'A3', precision: 2 },
  nsites: { label: 'Sites', unit: '', precision: 0 },
  bulk_modulus: { label: 'Bulk Modulus', unit: 'GPa', precision: 2 },
  shear_modulus: { label: 'Shear Modulus', unit: 'GPa', precision: 2 },
  universal_anisotropy: { label: 'Universal Anisotropy', unit: '', precision: 3 },
  homogeneous_poisson: { label: 'Poisson Ratio', unit: '', precision: 3 },
  e_total: { label: 'Dielectric Constant', unit: '', precision: 3 },
  n: { label: 'Refractive Index', unit: 'nD', precision: 3 },
  total_magnetization: { label: 'Total Magnetization', unit: 'muB', precision: 3 }
};

/**
 * Format a Materials Project property.
 * @param {string} key MP property key.
 * @param {unknown} value Raw property value.
 * @returns {{label: string, value: unknown, unit: string, formatted: string}} Formatted property metadata.
 */
export function formatMPProperty(key, value) {
  const meta = MP_PROPERTY_META[key] || { label: key.replaceAll('_', ' '), unit: '', precision: 3 };
  if (value === null || value === undefined || value === '') {
    return { label: meta.label, value, unit: meta.unit, formatted: 'n/a' };
  }
  const numeric = Number(value);
  const formatted = Number.isFinite(numeric)
    ? meta.precision === 0
      ? Math.round(numeric).toLocaleString()
      : formatNumber(numeric, Math.min(meta.precision || 3, 3))
    : String(value);
  return {
    label: meta.label,
    value,
    unit: meta.unit,
    formatted: `${formatted}${meta.unit ? ` ${meta.unit}` : ''}`
  };
}

/**
 * Return badge metadata for a Materials Project material.
 * @param {object} material MP material summary.
 * @returns {{label: string, color: string}} Badge metadata.
 */
export function getMPQualityBadge(material) {
  if (material?.theoretical === false) {
    return { label: 'Experimentally Verified', color: 'emerald' };
  }
  if (material?.is_stable === true) {
    return { label: 'Stable', color: 'emerald' };
  }
  if (material?.is_stable === false) {
    return { label: 'Unstable', color: 'red' };
  }
  return { label: 'DFT Computed', color: 'blue' };
}

/**
 * Format a crystal system label.
 * @param {string} system Crystal system value.
 * @returns {string} Display label with symbol.
 */
export function formatCrystalSystem(system) {
  if (!system) {
    return 'Unknown';
  }
  const normalized = String(system).toLowerCase();
  const icons = {
    cubic: '■',
    hexagonal: '⬡',
    tetragonal: '▣',
    orthorhombic: '▭',
    trigonal: '△',
    monoclinic: '▱',
    triclinic: '◇'
  };
  return `${icons[normalized] || '◆'} ${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

/**
 * Format a Materials Project space group object.
 * @param {object | string} spacegroup Space group object or string.
 * @returns {string} Formatted space group.
 */
export function formatSpacegroup(spacegroup) {
  if (!spacegroup) {
    return 'Unknown';
  }
  if (typeof spacegroup === 'string') {
    return spacegroup;
  }
  const symbol = spacegroup.symbol || spacegroup.crystal_system || 'Unknown';
  return spacegroup.number ? `${symbol} (#${spacegroup.number})` : symbol;
}

/**
 * Compare ML and MP scalar values.
 * @param {number | string | null} mlVal ML value.
 * @param {number | string | null} mpVal MP value.
 * @param {string} propertyKey Property key.
 * @returns {{delta_pct: number | null, direction: string, significant: boolean}} Comparison metadata.
 */
export function compareMlToMp(mlVal, mpVal, propertyKey) {
  if (mlVal === null || mlVal === undefined || mlVal === '' || mpVal === null || mpVal === undefined || mpVal === '') {
    return { delta_pct: null, direction: 'none', significant: false, propertyKey };
  }
  const ml = Number(mlVal);
  const mp = Number(mpVal);
  if (!Number.isFinite(ml) || !Number.isFinite(mp)) {
    return { delta_pct: null, direction: 'none', significant: false, propertyKey };
  }
  const denominator = Math.abs(mp) > 1e-12 ? Math.abs(mp) : 1;
  const delta = ((ml - mp) / denominator) * 100;
  return {
    delta_pct: Number(delta.toFixed(1)),
    direction: delta > 0 ? 'higher' : delta < 0 ? 'lower' : 'same',
    significant: Math.abs(delta) > 20,
    propertyKey
  };
}
