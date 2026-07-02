import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UiState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light', // TODO(decisión): tema oscuro queda para v2, solo "claro" es funcional
  setTheme: (theme) => set({ theme }),
}));
