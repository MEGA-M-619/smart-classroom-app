import { useEffect } from 'react';

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function resolveDarkMode(user) {
  if (!user) return false;
  const pref = user.themePreference || 'system';
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return systemPrefersDark();
}

export function applyTheme(darkMode) {
  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
}

export function useTheme(user) {
  useEffect(() => {
    const dark = resolveDarkMode(user);
    applyTheme(dark);

    if ((user?.themePreference || 'system') !== 'system') return undefined;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [user?.darkMode, user?.themePreference]);
}
