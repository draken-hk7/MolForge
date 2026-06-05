import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.response?.data?.error || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

/**
 * Parse a SMILES string into molecule graph data.
 * @param {string} smiles SMILES string to parse.
 * @returns {Promise<object>} Parsed molecule payload.
 */
export async function parseMolecule(smiles) {
  const { data } = await api.post('/api/molecules/parse', { smiles });
  return data;
}

/**
 * Mutate one atom in a molecule.
 * @param {string} smiles Starting SMILES string.
 * @param {number} atomIdx Zero-based atom index.
 * @param {string} newElement Replacement element symbol.
 * @returns {Promise<object>} Mutated molecule payload.
 */
export async function mutateAtom(smiles, atomIdx, newElement) {
  const { data } = await api.post('/api/molecules/mutate', {
    smiles,
    atom_idx: atomIdx,
    new_element: newElement
  });
  return data;
}

/**
 * Attach a functional group to a molecule.
 * @param {string} smiles Starting SMILES string.
 * @param {string} group Functional group name.
 * @returns {Promise<object>} Mutated molecule payload.
 */
export async function addFunctionalGroup(smiles, group) {
  const { data } = await api.post('/api/molecules/add-group', { smiles, group });
  return data;
}

/**
 * Fetch molecular descriptors.
 * @param {string} smiles SMILES string to describe.
 * @returns {Promise<object>} Descriptor response payload.
 */
export async function getDescriptors(smiles) {
  const { data } = await api.post('/api/molecules/descriptors', { smiles });
  return data;
}

/**
 * Load curated sample molecules.
 * @returns {Promise<object[]>} Sample molecule list.
 */
export async function getSamples() {
  const { data } = await api.get('/api/molecules/samples');
  return data;
}

/**
 * Predict material properties for one molecule.
 * @param {string} smiles SMILES string to predict.
 * @returns {Promise<object>} Prediction response payload.
 */
export async function predictProperties(smiles) {
  const { data } = await api.post('/api/properties/predict', { smiles });
  return data;
}

/**
 * Compare property predictions for two molecules.
 * @param {string} smilesOriginal Original molecule SMILES.
 * @param {string} smilesModified Modified molecule SMILES.
 * @returns {Promise<object>} Comparison response payload.
 */
export async function compareProperties(smilesOriginal, smilesModified) {
  const { data } = await api.post('/api/properties/compare', {
    smiles_original: smilesOriginal,
    smiles_modified: smilesModified
  });
  return data;
}

/**
 * Run geometry optimization for a molecule.
 * @param {string} smiles SMILES string to optimize.
 * @returns {Promise<object>} Optimization response payload.
 */
export async function optimizeGeometry(smiles) {
  const { data } = await api.post('/api/simulation/optimize', { smiles });
  return data;
}

/**
 * Check the status of a simulation job.
 * @param {string} jobId Simulation job identifier.
 * @returns {Promise<object>} Status payload.
 */
export async function getSimulationStatus(jobId) {
  const { data } = await api.post(`/api/simulation/status/${jobId}`);
  return data;
}

/**
 * Run inverse design for a target property.
 * @param {string} targetProperty Property key to optimize.
 * @param {number} targetValue Desired target value.
 * @param {number} nCandidates Number of candidates to return.
 * @returns {Promise<object>} Inverse design response payload.
 */
export async function runInverseDesign(targetProperty, targetValue, nCandidates) {
  const { data } = await api.post('/api/inverse-design/run', {
    target_property: targetProperty,
    target_value: Number(targetValue),
    n_candidates: Number(nCandidates)
  });
  return data;
}
