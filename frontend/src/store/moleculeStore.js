import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const initialState = {
  currentSmiles: '',
  currentMolecule: null,
  currentProperties: null,
  modifiedSmiles: '',
  modifiedProperties: null,
  mpData: null,
  mpStatus: { available: false, key_set: false, cache_size: 0, message: '' },
  mpMaterials: [],
  selectedMPMaterial: null,
  proteinStatus: { esmfold_available: false, uniprot_available: true, message: '' },
  currentProtein: null,
  proteinStructure: null,
  proteinProperties: null,
  uniprotResults: [],
  selectedUniprotEntry: null,
  proteinHistory: [],
  proteinLoading: false,
  proteinError: '',
  predictionSettings: {
    autoEnrichPredictions: true,
    showMpComparison: true,
    preferredDataSource: 'both'
  },
  sessionHistory: [],
  savedMolecules: [],
  activeCloudMolecule: null,
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
      setSmiles: (currentSmiles) =>
        set({ currentSmiles, modifiedSmiles: '', modifiedProperties: null, mpData: null, selectedMPMaterial: null, error: '' }),
      setMolecule: (currentMolecule) => set({ currentMolecule }),
      setProperties: (currentProperties) => set({ currentProperties }),
      mergeCloudProperties: (cloudProperties) =>
        set((state) =>
          state.modifiedSmiles
            ? { modifiedProperties: { ...(state.modifiedProperties || {}), ...(cloudProperties || {}) } }
            : { currentProperties: { ...(state.currentProperties || {}), ...(cloudProperties || {}) } }
        ),
      setModifiedSmiles: (modifiedSmiles) => set({ modifiedSmiles }),
      setModifiedProperties: (modifiedProperties) => set({ modifiedProperties }),
      setMpData: (mpData) => set({ mpData }),
      setMpStatus: (mpStatus) => set({ mpStatus }),
      setMpMaterials: (mpMaterials) => set({ mpMaterials }),
      setSelectedMPMaterial: (selectedMPMaterial) => set({ selectedMPMaterial }),
      setProteinStatus: (proteinStatus) => set({ proteinStatus }),
      setCurrentProtein: (currentProtein) => set({ currentProtein }),
      setProteinStructure: (proteinStructure) => set({ proteinStructure }),
      setProteinProperties: (proteinProperties) => set({ proteinProperties }),
      setUniprotResults: (uniprotResults) => set({ uniprotResults }),
      setSelectedUniprotEntry: (selectedUniprotEntry) => set({ selectedUniprotEntry }),
      setProteinLoading: (proteinLoading) => set({ proteinLoading }),
      setProteinError: (proteinError) => set({ proteinError: proteinError || '' }),
      addToProteinHistory: (entry) =>
        set((state) => ({
          proteinHistory: [
            {
              id: entry.id || crypto.randomUUID(),
              timestamp: entry.timestamp || new Date().toISOString(),
              name: entry.name || 'Protein structure',
              sequence: entry.sequence || '',
              method: entry.method || 'unknown'
            },
            ...state.proteinHistory
          ].slice(0, 20)
        })),
      setPredictionSetting: (key, value) =>
        set((state) => ({
          predictionSettings: { ...state.predictionSettings, [key]: value }
        })),
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
      setActiveCloudMolecule: (activeCloudMolecule) => set({ activeCloudMolecule }),
      removeSavedMolecule: (id) =>
        set((state) => ({
          savedMolecules: state.savedMolecules.filter((item) => item.id !== id)
        })),
      clearSession: () =>
        set({
          ...initialState,
          savedMolecules: get().savedMolecules,
          mpStatus: get().mpStatus,
          predictionSettings: get().predictionSettings
        })
    }),
    {
      name: 'molforge-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedMolecules: state.savedMolecules,
        sessionHistory: state.sessionHistory,
        predictionSettings: state.predictionSettings
      })
    }
  )
);
