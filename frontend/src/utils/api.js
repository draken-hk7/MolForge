import axios from 'axios';
import { getAccessToken, supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
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
export async function predictProperties(smiles, options = {}) {
  const { data } = await api.post('/api/properties/predict', { smiles }, { params: { mp: options.mp !== false } });
  return data;
}

export async function getPublicMolecules(params = {}) {
  if (supabase) {
    let query = supabase.from('molecules').select('*', { count: 'exact' }).eq('is_public', true);
    if (params.search) query = query.or(`name.ilike.%${params.search}%,smiles.ilike.%${params.search}%`);
    if (params.tag) query = query.contains('tags', [params.tag]);
    const order = { most_forked: 'fork_count', most_viewed: 'view_count' }[params.sort] || 'created_at';
    const { data, count, error } = await query.order(order, { ascending: false }).range(0, 23);
    if (!error) return { items: data || [], total: count || 0, page: 1, page_size: 24 };
  }
  const { data } = await api.get('/api/community/explore', { params });
  return data;
}

export async function getSharedMolecule(token) {
  if (supabase) {
    const { data, error } = await supabase.from('molecules').select('*').eq('share_token', token).eq('is_public', true).maybeSingle();
    if (!error && data) return data;
  }
  const { data } = await api.get(`/api/collab/molecules/shared/${token}`);
  return data;
}

export async function getMoleculeComments(moleculeId) {
  if (supabase) {
    const { data, error } = await supabase.from('comments').select('*').eq('molecule_id', moleculeId).order('created_at');
    if (!error) return data || [];
  }
  const { data } = await api.get(`/api/collab/comments/${moleculeId}`);
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

/**
 * Search Materials Project by formula.
 * @param {string} formula Formula string.
 * @param {boolean} includeElasticity Include elasticity lookups.
 * @returns {Promise<object[]>} MP material summaries.
 */
export async function searchMPByFormula(formula, includeElasticity = false) {
  const { data } = await api.post('/api/mp/search-formula', { formula, include_elasticity: includeElasticity });
  return data;
}

/**
 * Search Materials Project by element set.
 * @param {string[]} elements Element symbols.
 * @returns {Promise<object[]>} MP material summaries.
 */
export async function searchMPByElements(elements) {
  const { data } = await api.post('/api/mp/search-elements', { elements });
  return data;
}

/**
 * Fetch a full Materials Project material detail.
 * @param {string} materialId Materials Project material id.
 * @returns {Promise<object>} Material detail.
 */
export async function getMPMaterial(materialId) {
  const { data } = await api.get(`/api/mp/material/${materialId}`);
  return data;
}

/**
 * Enrich local ML predictions with Materials Project data.
 * @param {string} smiles SMILES string.
 * @param {object} mlPredictions Local prediction payload.
 * @returns {Promise<object>} Reconciled prediction payload.
 */
export async function enrichPredictionWithMP(smiles, mlPredictions) {
  const { data } = await api.post('/api/mp/enrich-prediction', {
    smiles,
    ml_predictions: mlPredictions
  });
  return data;
}

/**
 * Fetch Materials Project connection status.
 * @returns {Promise<object>} MP status payload.
 */
export async function getMPStatus() {
  const { data } = await api.get('/api/mp/status');
  return data;
}

/**
 * Set and validate a Materials Project API key for this backend session.
 * @param {string} apiKey Materials Project API key.
 * @returns {Promise<object>} Validation result.
 */
export async function setMPApiKey(apiKey) {
  const { data } = await api.post('/api/mp/set-key', { api_key: apiKey });
  return data;
}

/**
 * Clear the Materials Project cache.
 * @returns {Promise<object>} Cache clear result.
 */
export async function clearMPCache() {
  const { data } = await api.post('/api/mp/clear-cache');
  return data;
}

export async function getProteinStatus() {
  const { data } = await api.get('/api/proteins/status');
  return data;
}

export async function analyzeProteinSequence(sequence) {
  const { data } = await api.post('/api/proteins/analyze-sequence', { sequence });
  return data;
}

export async function predictProteinStructure(sequence) {
  const { data } = await api.post('/api/proteins/predict', { sequence });
  return data;
}

export async function searchUniprotProteins(query, limit = 10) {
  const { data } = await api.get('/api/proteins/search-uniprot', { params: { q: query, limit } });
  return data;
}

export async function getUniprotProtein(uniprotId) {
  const { data } = await api.get(`/api/proteins/uniprot/${uniprotId}`);
  return data;
}

export async function getProteinStructureById(uniprotId) {
  const { data } = await api.get(`/api/proteins/structure/${uniprotId}`);
  return data;
}

export async function compareProteinStructures(sequenceA, sequenceB) {
  const { data } = await api.post('/api/proteins/compare', { sequence_a: sequenceA, sequence_b: sequenceB });
  return data;
}

export async function searchProteinLigands(query, limit = 8) {
  const { data } = await api.get('/api/proteins/ligands', { params: { q: query, limit } });
  return data;
}
