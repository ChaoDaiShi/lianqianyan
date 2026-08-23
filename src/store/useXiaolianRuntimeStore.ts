import { create } from 'zustand';

export type XiaolianRuntimeState = 'idle' | 'thinking' | 'loading';

export type XiaolianCompanionState =
  | 'companion'
  | 'encouraging'
  | 'reminding'
  | 'celebrating';

interface XiaolianRuntimeStore {
  runtimeState: XiaolianRuntimeState;
  companionState: XiaolianCompanionState;
  setRuntimeState: (state: XiaolianRuntimeState) => void;
  setCompanionState: (state: XiaolianCompanionState) => void;
  resetRuntime: () => void;
  resetCompanion: () => void;
  reset: () => void;
}

export const useXiaolianRuntimeStore = create<XiaolianRuntimeStore>((set) => ({
  runtimeState: 'idle',
  companionState: 'companion',
  setRuntimeState: (runtimeState) => set({ runtimeState }),
  setCompanionState: (companionState) => set({ companionState }),
  resetRuntime: () => set({ runtimeState: 'idle' }),
  resetCompanion: () => set({ companionState: 'companion' }),
  reset: () =>
    set({
      runtimeState: 'idle',
      companionState: 'companion',
    }),
}));
