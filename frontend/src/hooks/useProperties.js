import { useCallback } from 'react';

import { compareProperties, predictProperties } from '../utils/api';
import { useMoleculeStore } from '../store/moleculeStore';

/**
 * Provide property prediction actions with store updates.
 * @returns {object} Property workflow state and async actions.
 */
export function useProperties() {
  const store = useMoleculeStore();

  const predictActiveProperties = useCallback(async () => {
    const original = store.currentSmiles;
    const modified = store.modifiedSmiles;
    if (!original) {
      throw new Error('Load a molecule before predicting properties.');
    }
    store.setLoading(true);
    store.setError('');
    try {
      if (modified) {
        const comparison = await compareProperties(original, modified);
        store.setProperties(comparison.original);
        store.setModifiedProperties(comparison.modified);
        store.addToHistory({ smiles: modified, properties: comparison.modified, name: 'Modified prediction' });
        return comparison;
      }
      const prediction = await predictProperties(original);
      store.setProperties(prediction.properties);
      store.addToHistory({ smiles: original, properties: prediction.properties, name: 'Property prediction' });
      return prediction;
    } catch (error) {
      store.setError(error.message);
      throw error;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  return {
    currentProperties: store.currentProperties,
    modifiedProperties: store.modifiedProperties,
    isLoading: store.isLoading,
    error: store.error,
    predictActiveProperties
  };
}
