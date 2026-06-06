const AMINO_ACIDS = {
  A: { name: 'Alanine', abbreviation: 'Ala', category: 'nonpolar', color: '#cbd5e1' },
  C: { name: 'Cysteine', abbreviation: 'Cys', category: 'polar', color: '#eab308' },
  D: { name: 'Aspartate', abbreviation: 'Asp', category: 'acidic', color: '#ef4444' },
  E: { name: 'Glutamate', abbreviation: 'Glu', category: 'acidic', color: '#ef4444' },
  F: { name: 'Phenylalanine', abbreviation: 'Phe', category: 'aromatic', color: '#a855f7' },
  G: { name: 'Glycine', abbreviation: 'Gly', category: 'nonpolar', color: '#94a3b8' },
  H: { name: 'Histidine', abbreviation: 'His', category: 'basic', color: '#3b82f6' },
  I: { name: 'Isoleucine', abbreviation: 'Ile', category: 'nonpolar', color: '#cbd5e1' },
  K: { name: 'Lysine', abbreviation: 'Lys', category: 'basic', color: '#3b82f6' },
  L: { name: 'Leucine', abbreviation: 'Leu', category: 'nonpolar', color: '#cbd5e1' },
  M: { name: 'Methionine', abbreviation: 'Met', category: 'nonpolar', color: '#eab308' },
  N: { name: 'Asparagine', abbreviation: 'Asn', category: 'polar', color: '#14b8a6' },
  P: { name: 'Proline', abbreviation: 'Pro', category: 'nonpolar', color: '#f97316' },
  Q: { name: 'Glutamine', abbreviation: 'Gln', category: 'polar', color: '#14b8a6' },
  R: { name: 'Arginine', abbreviation: 'Arg', category: 'basic', color: '#3b82f6' },
  S: { name: 'Serine', abbreviation: 'Ser', category: 'polar', color: '#14b8a6' },
  T: { name: 'Threonine', abbreviation: 'Thr', category: 'polar', color: '#14b8a6' },
  V: { name: 'Valine', abbreviation: 'Val', category: 'nonpolar', color: '#cbd5e1' },
  W: { name: 'Tryptophan', abbreviation: 'Trp', category: 'aromatic', color: '#a855f7' },
  Y: { name: 'Tyrosine', abbreviation: 'Tyr', category: 'aromatic', color: '#a855f7' }
};

export function formatAminoAcid(code) {
  return AMINO_ACIDS[String(code || '').toUpperCase()] || { name: 'Unknown', abbreviation: code, category: 'unknown', color: '#6b7280' };
}

export function getSecondaryStructureColor(type) {
  const colors = { helix: '#ef4444', sheet: '#eab308', loop: '#6b7280', turn: '#6b7280' };
  return colors[String(type || '').toLowerCase()] || colors.loop;
}

export function formatPLDDT(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) {
    return { label: 'Not available', color: '#6b7280' };
  }
  if (value > 90) {
    return { label: 'Very High', color: '#3b82f6' };
  }
  if (value >= 70) {
    return { label: 'High', color: '#22c55e' };
  }
  if (value >= 50) {
    return { label: 'Low', color: '#eab308' };
  }
  return { label: 'Very Low', color: '#f97316' };
}

export function formatProteinWeight(daltons) {
  const value = Number(daltons);
  return Number.isFinite(value) ? `${(value / 1000).toFixed(1)} kDa` : 'n/a';
}

export function getAminoAcidColor(aa) {
  return formatAminoAcid(aa).color;
}

export function normalizeProteinSequence(value) {
  return String(value || '')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('>'))
    .join('')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function validateProteinSequence(value) {
  const sequence = normalizeProteinSequence(value);
  const invalid = [...new Set(sequence.split('').filter((character) => !'ACDEFGHIKLMNPQRSTVWY'.includes(character)))];
  return {
    sequence,
    valid: sequence.length > 0 && invalid.length === 0 && sequence.length <= 1000,
    invalid,
    length: sequence.length
  };
}
