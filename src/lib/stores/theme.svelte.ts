export type Theme = 'dark' | 'light';

const KEY = 'flame:theme';

// index.html already set data-theme before paint; read it back as the truth.
let _theme: Theme = $state(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export const theme = {
  get current() {
    return _theme;
  },
  toggle() {
    _theme = _theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = _theme;
    try {
      localStorage.setItem(KEY, _theme);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
  },
};
