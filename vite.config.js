// client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/connect': {
        target: 'https://server.dscovar.org',
        changeOrigin: true,
        secure: true,
      },
      '/activity': {
        target: 'https://labs.dscovar.org',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
