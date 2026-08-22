import { create } from 'zustand';

export type XiaolianRuntimeState =
  | 'idle'
  | 'thinking'
  | 'analyzing'
  | 'planning'
  | 'teaching'
  | 'evaluating'
  | 'success';

interface XiaolianRuntimeStore {
  state: XiaolianRuntimeState;
  setState: (state: XiaolianRuntimeState) => void;
  reset: () => void;
}

export const useXiaolianRuntimeStore = create<XiaolianRuntimeStore>((set) => ({
  state: 'idle',
  setState: (state) => set({ state }),
  reset: () => set({ state: 'idle' }),
}));
