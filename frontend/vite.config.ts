import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '');
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // Browsers on the LAN use the same origin for the app and its cookies.
      // Only Vite needs to reach the API on this computer.
      proxy: {
        '/api': { target: `http://127.0.0.1:${process.env.PORT || env.PORT || 3001}`, changeOrigin: true },
      },
    },
  };
});
