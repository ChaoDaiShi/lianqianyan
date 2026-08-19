import { create } from 'zustand';

/**
 * 全局小涟 Assistant 面板状态。
 * 页面右下角悬浮入口与面板共享同一份打开/关闭状态。
 */
interface AssistantState {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  togglePanel: () => set((state) => ({ open: !state.open })),
}));
