import { useCallback, useEffect } from 'react';

import { useMoleculeStore } from '../store/moleculeStore';
import {
  analyzeProteinSequence,
  getProteinStatus,
  getProteinStructureById,
  getUniprotProtein,
  predictProteinStructure,
  searchUniprotProteins
} from '../utils/api';

export function useProtein() {
  const proteinStatus = useMoleculeStore((state) => state.proteinStatus);
  const currentProtein = useMoleculeStore((state) => state.currentProtein);
  const proteinStructure = useMoleculeStore((state) => state.proteinStructure);
  const proteinProperties = useMoleculeStore((state) => state.proteinProperties);
  const uniprotResults = useMoleculeStore((state) => state.uniprotResults);
  const selectedUniprotEntry = useMoleculeStore((state) => state.selectedUniprotEntry);
  const proteinLoading = useMoleculeStore((state) => state.proteinLoading);
  const proteinError = useMoleculeStore((state) => state.proteinError);
  const setProteinStatus = useMoleculeStore((state) => state.setProteinStatus);
  const setCurrentProtein = useMoleculeStore((state) => state.setCurrentProtein);
  const setProteinStructure = useMoleculeStore((state) => state.setProteinStructure);
  const setProteinProperties = useMoleculeStore((state) => state.setProteinProperties);
  const setUniprotResults = useMoleculeStore((state) => state.setUniprotResults);
  const setSelectedUniprotEntry = useMoleculeStore((state) => state.setSelectedUniprotEntry);
  const setProteinLoading = useMoleculeStore((state) => state.setProteinLoading);
  const setProteinError = useMoleculeStore((state) => state.setProteinError);
  const addToProteinHistory = useMoleculeStore((state) => state.addToProteinHistory);

  const checkStatus = useCallback(async () => {
    try {
      const status = await getProteinStatus();
      setProteinStatus(status);
      return status;
    } catch (error) {
      const status = { esmfold_available: false, uniprot_available: false, message: error.message };
      setProteinStatus(status);
      return status;
    }
  }, [setProteinStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const analyzeSequence = useCallback(
    async (sequence) => {
      setProteinLoading(true);
      setProteinError('');
      try {
        const properties = await analyzeProteinSequence(sequence);
        setProteinProperties(properties);
        return properties;
      } catch (error) {
        setProteinError(error.message);
        throw error;
      } finally {
        setProteinLoading(false);
      }
    },
    [setProteinError, setProteinLoading, setProteinProperties]
  );

  const predictStructure = useCallback(
    async (sequence) => {
      setCurrentProtein({ sequence });
      setProteinError('');
      try {
        const properties = await analyzeProteinSequence(sequence);
        setProteinProperties(properties);
      } catch (error) {
        setProteinError(error.message);
        throw error;
      }
      setProteinLoading(true);
      try {
        const structure = await predictProteinStructure(sequence);
        setProteinStructure(structure);
        setProteinProperties(structure.properties);
        addToProteinHistory({ sequence, method: structure.method, name: 'Protein prediction' });
        return structure;
      } catch (error) {
        setProteinError(error.message);
        throw error;
      } finally {
        setProteinLoading(false);
      }
    },
    [addToProteinHistory, setCurrentProtein, setProteinError, setProteinLoading, setProteinProperties, setProteinStructure]
  );

  const searchUniprot = useCallback(
    async (query) => {
      setProteinLoading(true);
      setProteinError('');
      try {
        const results = await searchUniprotProteins(query);
        setUniprotResults(results);
        return results;
      } catch (error) {
        setProteinError(error.message);
        return [];
      } finally {
        setProteinLoading(false);
      }
    },
    [setProteinError, setProteinLoading, setUniprotResults]
  );

  const getUniprotEntry = useCallback(
    async (id) => {
      setProteinLoading(true);
      setProteinError('');
      try {
        const entry = await getUniprotProtein(id);
        setSelectedUniprotEntry(entry);
        setCurrentProtein(entry);
        return entry;
      } catch (error) {
        setProteinError(error.message);
        throw error;
      } finally {
        setProteinLoading(false);
      }
    },
    [setCurrentProtein, setProteinError, setProteinLoading, setSelectedUniprotEntry]
  );

  const getStructureById = useCallback(
    async (id) => {
      setProteinLoading(true);
      setProteinError('');
      try {
        const structure = await getProteinStructureById(id);
        setProteinStructure(structure);
        setProteinProperties(structure.properties);
        setSelectedUniprotEntry(structure.uniprot || null);
        setCurrentProtein(structure.uniprot || { uniprot_id: id });
        addToProteinHistory({ sequence: structure.uniprot?.sequence || '', method: structure.method, name: id });
        return structure;
      } catch (error) {
        setProteinError(error.message);
        throw error;
      } finally {
        setProteinLoading(false);
      }
    },
    [addToProteinHistory, setCurrentProtein, setProteinError, setProteinLoading, setProteinProperties, setProteinStructure, setSelectedUniprotEntry]
  );

  return {
    proteinStatus,
    currentProtein,
    currentSequence: currentProtein?.sequence || '',
    currentStructure: proteinStructure,
    proteinProperties,
    uniprotResults,
    selectedUniprotEntry,
    isLoading: proteinLoading,
    error: proteinError,
    predictStructure,
    analyzeSequence,
    searchUniprot,
    getUniprotEntry,
    getStructureById,
    checkStatus
  };
}
