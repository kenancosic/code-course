import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type Modal = 'none' | 'settings' | 'help' | 'confirm';

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  currentModal: Modal;
}

interface UIActions {
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  openModal: (modal: Modal) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      currentModal: 'none',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      openModal: (modal) => set({ currentModal: modal }),
      closeModal: () => set({ currentModal: 'none' }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen, theme: state.theme }),
    }
  )
);
