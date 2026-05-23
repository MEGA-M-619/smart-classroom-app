const normalizeBaseUrl = (value) => (value || '').replace(/\/+$/, '');

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'SmartClass',
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || ''),
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000),
  analyticsId: import.meta.env.VITE_ANALYTICS_ID || '',
  environment: import.meta.env.MODE,
};

export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return appConfig.apiBaseUrl ? `${appConfig.apiBaseUrl}/api${cleanPath}` : `/api${cleanPath}`;
}

export function assetUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return appConfig.apiBaseUrl ? `${appConfig.apiBaseUrl}${cleanPath}` : cleanPath;
}
