import { useCallback, useState } from 'react';

import { optimizeGeometry } from '../utils/api';
import { useMoleculeStore } from '../store/moleculeStore';

/**
 * Provide simulation actions for the active molecule.
 * @returns {object} Simulation state and actions.
 */
export function useSimulation() {
  const { currentSmiles, modifiedSmiles, setError } = useMoleculeStore();
  const [result, setResult] = useState(null);
  const [isOptimizing, setOptimizing] = useState(false);

  const optimizeActiveGeometry = useCallback(async () => {
    const smiles = modifiedSmiles || currentSmiles;
    if (!smiles) {
      throw new Error('Load a molecule before optimizing geometry.');
    }
    setOptimizing(true);
    setError('');
    try {
      const response = await optimizeGeometry(smiles);
      setResult(response);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setOptimizing(false);
    }
  }, [currentSmiles, modifiedSmiles, setError]);

  return {
    result,
    isOptimizing,
    optimizeActiveGeometry
  };
}
