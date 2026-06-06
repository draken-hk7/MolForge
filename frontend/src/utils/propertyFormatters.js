export const PROPERTY_DEFINITIONS = {
  bandgap_ev: {
    label: 'Band Gap',
    unit: 'eV',
    range: [0, 10],
    color: '#818cf8',
    better: 'target'
  },
  melting_point_k: {
    label: 'Melting Point',
    unit: 'K',
    range: [200, 3000],
    color: '#f59e0b',
    better: 'higher'
  },
  solubility_logS: {
    label: 'Solubility',
    unit: 'logS',
    range: [-10, 2],
    color: '#22c55e',
    better: 'higher'
  },
  hardness_gpa: {
    label: 'Hardness',
    unit: 'GPa',
    range: [0.1, 100],
    color: '#38bdf8',
    better: 'higher'
  },
  conductivity_sm: {
    label: 'Conductivity',
    unit: 'S/m',
    range: [1e-9, 1e6],
    color: '#f472b6',
    better: 'higher'
  },
  refractive_index: {
    label: 'Refractive Index',
    unit: 'nD',
    range: [1, 4],
    color: '#a3e635',
    better: 'target'
  }
};

/**
 * Convert a property map to ordered display entries.
 * @param {object | null} properties Prediction object.
 * @returns {Array<object>} Ordered property entries.
 */
export function propertyEntries(properties) {
  if (!properties) {
    return [];
  }
  return Object.keys(PROPERTY_DEFINITIONS)
    .filter((key) => properties[key])
    .map((key) => ({
      key,
      ...PROPERTY_DEFINITIONS[key],
      ...properties[key]
    }));
}

/**
 * Format a number with a bounded significant-figure budget.
 * @param {number | string} value Raw value.
 * @param {number} decimals Maximum significant figures.
 * @returns {string} Display-ready number.
 */
export function formatNumber(value, decimals = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'n/a';
  }
  if (numeric === 0) {
    return '0';
  }
  const precision = Math.max(1, Number(decimals) || 3);
  const rounded = Number(numeric.toPrecision(precision));
  if (Math.abs(rounded) >= 1000) {
    return rounded.toLocaleString(undefined, { maximumSignificantDigits: precision });
  }
  return String(rounded);
}

/**
 * Format a number with multiplication-style scientific notation.
 * @param {number | string} value Raw value.
 * @param {number} decimals Mantissa decimal places.
 * @returns {string} Scientific notation string.
 */
export function formatScientific(value, decimals = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'n/a';
  }
  if (numeric === 0) {
    return '0';
  }
  const exponent = Math.floor(Math.log10(Math.abs(numeric)));
  const mantissa = numeric / 10 ** exponent;
  return `${mantissa.toFixed(decimals)} × 10^${exponent}`;
}

/**
 * Format a percentage with consistent precision.
 * @param {number | string} value Raw percentage value.
 * @param {number} decimals Decimal places.
 * @param {boolean} showSign Whether to prefix positive values with +.
 * @returns {string} Display-ready percentage.
 */
export function formatPercent(value, decimals = 1, showSign = false) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'n/a';
  }
  const sign = showSign && numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(decimals)}%`;
}

/**
 * Format a numeric property value with compact precision.
 * @param {string} key Property key.
 * @param {number | string} value Raw value.
 * @returns {string} Formatted numeric value.
 */
export function formatPropertyValue(key, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'n/a';
  }
  if (key === 'conductivity_sm') {
    return formatScientific(numeric, 1);
  }
  return formatNumber(numeric, 3);
}

/**
 * Normalize a property value to a 0-100 chart scale.
 * @param {string} key Property key.
 * @param {number | string} value Raw value.
 * @returns {number} Normalized value.
 */
export function normalizePropertyValue(key, value) {
  const definition = PROPERTY_DEFINITIONS[key];
  if (!definition) {
    return 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const [min, max] = definition.range;
  if (key === 'conductivity_sm') {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logValue = Math.log10(Math.max(min, numeric));
    return clamp(((logValue - logMin) / (logMax - logMin)) * 100, 0, 100);
  }
  return clamp(((numeric - min) / (max - min)) * 100, 0, 100);
}

/**
 * Format a property delta with sign and unit.
 * @param {string} key Property key.
 * @param {number} delta Numeric delta.
 * @returns {string} Display-ready delta.
 */
export function formatDelta(key, delta) {
  const numeric = Number(delta);
  if (!Number.isFinite(numeric)) {
    return 'n/a';
  }
  const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';
  return `${sign}${formatPropertyValue(key, Math.abs(numeric))} ${PROPERTY_DEFINITIONS[key]?.unit || ''}`.trim();
}

/**
 * Determine visual tone for a property delta.
 * @param {string} key Property key.
 * @param {number} delta Numeric delta.
 * @returns {'positive' | 'negative' | 'neutral'} Delta tone.
 */
export function deltaTone(key, delta) {
  const numeric = Number(delta);
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 1e-9) {
    return 'neutral';
  }
  const better = PROPERTY_DEFINITIONS[key]?.better;
  if (better === 'higher') {
    return numeric > 0 ? 'positive' : 'negative';
  }
  return 'neutral';
}

/**
 * Clamp a number to an interval.
 * @param {number} value Value to clamp.
 * @param {number} min Minimum value.
 * @param {number} max Maximum value.
 * @returns {number} Clamped value.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
