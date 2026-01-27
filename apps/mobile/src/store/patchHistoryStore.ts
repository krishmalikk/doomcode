import { create } from 'zustand';
import type { AppliedPatch } from '@doomcode/protocol';

interface PatchHistoryState {
  // Stack of applied patches (newest first)
  patches: AppliedPatch[];

  // Maximum number of patches to keep in history
  maxSize: number;

  // Currently pending undo request (to prevent double-undo)
  pendingUndo: string | null;

  // Last undo result for UI feedback
  lastUndoResult: {
    patchId: string;
    success: boolean;
    error?: string;
    revertedFiles: string[];
  } | null;

  // Actions
  recordPatch: (patch: AppliedPatch) => void;
  markUndoPending: (patchId: string) => void;
  clearUndoPending: () => void;
  removePatch: (patchId: string) => void;
  setLastUndoResult: (result: PatchHistoryState['lastUndoResult']) => void;
  clearLastUndoResult: () => void;
  getLastPatch: () => AppliedPatch | undefined;
  canUndo: () => boolean;
  getPatchById: (patchId: string) => AppliedPatch | undefined;
  clearHistory: () => void;
}

export const usePatchHistoryStore = create<PatchHistoryState>((set, get) => ({
  patches: [],
  maxSize: 50,
  pendingUndo: null,
  lastUndoResult: null,

  recordPatch: (patch) =>
    set((state) => ({
      patches: [patch, ...state.patches].slice(0, state.maxSize),
    })),

  markUndoPending: (patchId) => set({ pendingUndo: patchId }),

  clearUndoPending: () => set({ pendingUndo: null }),

  removePatch: (patchId) =>
    set((state) => ({
      patches: state.patches.filter((p) => p.patchId !== patchId),
      pendingUndo: state.pendingUndo === patchId ? null : state.pendingUndo,
    })),

  setLastUndoResult: (result) => set({ lastUndoResult: result }),

  clearLastUndoResult: () => set({ lastUndoResult: null }),

  getLastPatch: () => get().patches[0],

  canUndo: () => {
    const state = get();
    return state.patches.length > 0 && state.pendingUndo === null;
  },

  getPatchById: (patchId) => get().patches.find((p) => p.patchId === patchId),

  clearHistory: () => set({ patches: [], pendingUndo: null, lastUndoResult: null }),
}));
