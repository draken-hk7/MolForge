import { useCallback, useEffect, useState } from 'react';

import {
  clearMPCache,
  enrichPredictionWithMP,
  getMPMaterial,
  getMPStatus,
  searchMPByElements,
  searchMPByFormula,
  setMPApiKey
} from '../utils/api';
import { useMoleculeStore } from '../store/moleculeStore';

/**
 * Provide Materials Project data actions and state.
 * @returns {object} Materials Project workflow state and async actions.
 */
export function useMaterialsProject() {
  const mpStatus = useMoleculeStore((state) => state.mpStatus);
  const mpMaterials = useMoleculeStore((state) => state.mpMaterials);
  const mpData = useMoleculeStore((state) => state.mpData);
  const selectedMPMaterial = useMoleculeStore((state) => state.selectedMPMaterial);
  const setMpStatus = useMoleculeStore((state) => state.setMpStatus);
  const setMpMaterials = useMoleculeStore((state) => state.setMpMaterials);
  const setSelectedMPMaterial = useMoleculeStore((state) => state.setSelectedMPMaterial);
  const setMpData = useMoleculeStore((state) => state.setMpData);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await getMPStatus();
      setMpStatus(status);
      return status;
    } catch (err) {
      const fallback = { available: false, key_set: false, cache_size: 0, message: err.message };
      setMpStatus(fallback);
      return fallback;
    }
  }, [setMpStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const searchByFormula = useCallback(
    async (formula) => {
      setLoading(true);
      setError(null);
      try {
        const materials = await searchMPByFormula(formula);
        setMpMaterials(materials);
        setSelectedMPMaterial(materials[0] || null);
        return materials;
      } catch (err) {
        setError(err.message);
        setMpMaterials([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [setMpMaterials, setSelectedMPMaterial]
  );

  const searchByElements = useCallback(
    async (elements) => {
      setLoading(true);
      setError(null);
      try {
        const materials = await searchMPByElements(elements);
        setMpMaterials(materials);
        setSelectedMPMaterial(materials[0] || null);
        return materials;
      } catch (err) {
        setError(err.message);
        setMpMaterials([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [setMpMaterials, setSelectedMPMaterial]
  );

  const getMaterialDetail = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        const material = await getMPMaterial(id);
        setSelectedMPMaterial(material);
        return material;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setSelectedMPMaterial]
  );

  const enrichPrediction = useCallback(
    async (smiles, mlPredictions) => {
      setLoading(true);
      setError(null);
      try {
        const enriched = await enrichPredictionWithMP(smiles, mlPredictions);
        setMpData(enriched);
        return enriched;
      } catch (err) {
        setError(err.message);
        setMpData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setMpData]
  );

  const setApiKey = useCallback(
    async (key) => {
      setLoading(true);
      setError(null);
      try {
        const result = await setMPApiKey(key);
        await checkStatus();
        return result;
      } catch (err) {
        setError(err.message);
        return { valid: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [checkStatus]
  );

  const clearCache = useCallback(async () => {
    const result = await clearMPCache();
    await checkStatus();
    return result;
  }, [checkStatus]);

  return {
    mpStatus: { ...mpStatus, checking: false },
    mpMaterials,
    bestMatch: mpData?.best_match || null,
    reconciledData: mpData,
    selectedMPMaterial,
    isLoading,
    error,
    searchByFormula,
    searchByElements,
    getMaterialDetail,
    enrichPrediction,
    setApiKey,
    checkStatus,
    clearCache
  };
}
