import { defineStore } from 'pinia';
import vuetify from '@/plugins/vuetify';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-mode';
const DEFAULT_MODE: ThemeMode = 'light';

let _mediaListener: (() => void) | null = null;

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? DEFAULT_MODE
  }),

  actions: {
    setMode(mode: ThemeMode) {
      this.mode = mode;
      localStorage.setItem(STORAGE_KEY, mode);
      this._apply();
    },

    _apply() {
      const isDark = this.mode === 'dark' || (this.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
      vuetify.theme.global.name.value = isDark ? 'dark' : 'light';
    },

    init() {
      this._apply();

      // Remove any previous listener before adding a new one
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (_mediaListener) mq.removeEventListener('change', _mediaListener);

      _mediaListener = () => {
        if (this.mode === 'system') this._apply();
      };
      mq.addEventListener('change', _mediaListener);
    }
  }
});
