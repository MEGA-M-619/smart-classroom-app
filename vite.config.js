import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:3001';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 700,
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': apiTarget,
        '/uploads': apiTarget,
      },
    },
    preview: {
      host: true,
      port: 5173,
      strictPort: true,
    },
  };
});
