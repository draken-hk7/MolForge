const BASIC_SMILES_PATTERN = /^[A-Za-z0-9@+\-[\]().=#$\\/:%]+$/;

/**
 * Run quick client-side SMILES validation before sending to the backend.
 * @param {string} smiles SMILES string to check.
 * @returns {{valid: boolean, message: string}} Validation result.
 */
export function validateSmilesPattern(smiles) {
  const trimmed = String(smiles || '').trim();
  if (!trimmed) {
    return { valid: false, message: 'SMILES is empty' };
  }
  if (!BASIC_SMILES_PATTERN.test(trimmed)) {
    return { valid: false, message: 'Contains unsupported characters' };
  }
  let balance = 0;
  for (const char of trimmed) {
    if (char === '(') {
      balance += 1;
    }
    if (char === ')') {
      balance -= 1;
    }
    if (balance < 0) {
      return { valid: false, message: 'Branch parentheses are unbalanced' };
    }
  }
  if (balance !== 0) {
    return { valid: false, message: 'Branch parentheses are unbalanced' };
  }
  return { valid: true, message: 'SMILES pattern looks valid' };
}

/**
 * Build a compact molecule label from a sample or SMILES string.
 * @param {object | string} value Sample object or SMILES string.
 * @returns {string} Display label.
 */
export function moleculeLabel(value) {
  if (typeof value === 'string') {
    return value.length > 24 ? `${value.slice(0, 21)}...` : value;
  }
  return value?.name || moleculeLabel(value?.smiles || '');
}

/**
 * Count atom records by element for a parsed molecule.
 * @param {object | null} molecule Parsed molecule payload.
 * @returns {string} Formula-like summary.
 */
export function atomSummary(molecule) {
  if (!molecule?.atoms?.length) {
    return 'No atoms';
  }
  const counts = molecule.atoms.reduce((acc, atom) => {
    acc[atom.element] = (acc[atom.element] || 0) + 1;
    return acc;
  }, {});
  return Object.keys(counts)
    .sort()
    .map((element) => `${element}${counts[element] > 1 ? counts[element] : ''}`)
    .join(' ');
}
