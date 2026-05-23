export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'SmartClass',
  analyticsId: import.meta.env.VITE_ANALYTICS_ID || '',
  environment: import.meta.env.MODE,
};
