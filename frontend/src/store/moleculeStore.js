import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const initialState = {
  currentSmiles: '',
  currentMolecule: null,
  currentProperties: null,
  modifiedSmiles: '',
  modifiedProperties: null,
  sessionHistory: [],
  savedMolecules: [],
  isLoading: false,
  error: ''
};

/**
 * Global molecule workflow store.
 */
export const useMoleculeStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      setSmiles: (currentSmiles) => set({ currentSmiles, modifiedSmiles: '', modifiedProperties: null, error: '' }),
      setMolecule: (currentMolecule) => set({ currentMolecule }),
      setProperties: (currentProperties) => set({ currentProperties }),
      setModifiedSmiles: (modifiedSmiles) => set({ modifiedSmiles }),
      setModifiedProperties: (modifiedProperties) => set({ modifiedProperties }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error: error || '' }),
      addToHistory: (entry) =>
        set((state) => ({
          sessionHistory: [
            {
              id: entry.id || crypto.randomUUID(),
              timestamp: entry.timestamp || new Date().toISOString(),
              smiles: entry.smiles,
              properties: entry.properties || null,
              name: entry.name || 'Untitled molecule'
            },
            ...state.sessionHistory
          ].slice(0, 30)
        })),
      saveMolecule: (entry) =>
        set((state) => {
          const record = {
            id: entry.id || crypto.randomUUID(),
            timestamp: entry.timestamp || new Date().toISOString(),
            name: entry.name || `Molecule ${state.savedMolecules.length + 1}`,
            smiles: entry.smiles || state.modifiedSmiles || state.currentSmiles,
            molecule: entry.molecule || state.currentMolecule,
            properties: entry.properties || state.modifiedProperties || state.currentProperties
          };
          return {
            savedMolecules: [record, ...state.savedMolecules.filter((item) => item.smiles !== record.smiles)]
          };
        }),
      removeSavedMolecule: (id) =>
        set((state) => ({
          savedMolecules: state.savedMolecules.filter((item) => item.id !== id)
        })),
      clearSession: () =>
        set({
          ...initialState,
          savedMolecules: get().savedMolecules
        })
    }),
    {
      name: 'molforge-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedMolecules: state.savedMolecules,
        sessionHistory: state.sessionHistory
      })
    }
  )
);
