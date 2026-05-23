import { useEffect } from 'react';

export function applyTheme(darkMode) {
  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
}

export function useTheme(user) {
  useEffect(() => {
    applyTheme(Boolean(user?.darkMode));
  }, [user?.darkMode]);
}
