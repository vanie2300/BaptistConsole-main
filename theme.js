(() => {
  const STORAGE_KEY = 'globalTheme';
  const CLASS_NAME = 'theme-light';

  function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.toggle(CLASS_NAME, theme === 'light');
    localStorage.setItem(STORAGE_KEY, theme === 'light' ? 'light' : 'dark');
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    document.documentElement.classList.toggle(CLASS_NAME, saved === 'light');
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      document.documentElement.classList.toggle(CLASS_NAME, event.newValue === 'light');
    }
  });

  initTheme();

  window.Theme = {
    apply: applyTheme,
    current: () => localStorage.getItem(STORAGE_KEY) || 'dark',
  };
})();
