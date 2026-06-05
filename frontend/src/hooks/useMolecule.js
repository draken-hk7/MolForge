import { useCallback } from 'react';

import { addFunctionalGroup, getSamples, mutateAtom, parseMolecule } from '../utils/api';
import { useMoleculeStore } from '../store/moleculeStore';

/**
 * Provide molecule parsing and editing actions with store updates.
 * @returns {object} Molecule workflow state and async actions.
 */
export function useMolecule() {
  const store = useMoleculeStore();

  const parse = useCallback(
    async (smiles, options = {}) => {
      store.setLoading(true);
      store.setError('');
      try {
        const molecule = await parseMolecule(smiles);
        if (!options.keepModified) {
          store.setSmiles(molecule.smiles);
        }
        store.setMolecule(molecule);
        store.addToHistory({
          smiles: molecule.smiles,
          properties: options.properties || null,
          name: options.name || molecule.smiles
        });
        return molecule;
      } catch (error) {
        store.setError(error.message);
        throw error;
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const mutate = useCallback(
    async (atomIdx, element) => {
      const source = store.modifiedSmiles || store.currentSmiles;
      if (!source) {
        throw new Error('Load a molecule before mutating atoms.');
      }
      store.setLoading(true);
      store.setError('');
      try {
        const result = await mutateAtom(source, Number(atomIdx), element);
        store.setModifiedSmiles(result.smiles);
        store.setMolecule(result.molecule);
        store.setModifiedProperties(null);
        store.addToHistory({ smiles: result.smiles, name: `Atom ${atomIdx} to ${element}` });
        return result;
      } catch (error) {
        store.setError(error.message);
        throw error;
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const addGroup = useCallback(
    async (group) => {
      const source = store.modifiedSmiles || store.currentSmiles;
      if (!source) {
        throw new Error('Load a molecule before adding a group.');
      }
      store.setLoading(true);
      store.setError('');
      try {
        const result = await addFunctionalGroup(source, group);
        store.setModifiedSmiles(result.smiles);
        store.setMolecule(result.molecule);
        store.setModifiedProperties(null);
        store.addToHistory({ smiles: result.smiles, name: `Added ${group}` });
        return result;
      } catch (error) {
        store.setError(error.message);
        throw error;
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const loadSamples = useCallback(async () => {
    const samples = await getSamples();
    return samples;
  }, []);

  return {
    ...store,
    parse,
    mutate,
    addGroup,
    loadSamples
  };
}
